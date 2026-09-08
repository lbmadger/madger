-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Audit avant tests : Pro effectif côté public, prorata des packs.
--
-- 1. public_coaches.pro et public_services (packs) prenaient seulement
--    pro_until : un coach Pro par accès OFFERT (code, parrainage :
--    pro_bonus_until) était traité comme Essentiel sur sa page publique
--    (règle d'annulation fixe, packs masqués). Le Pro effectif est
--    max(pro_until, pro_bonus_until) > now(), comme côté serveur.
-- 2. pack_credits.paid_total : nombre de séances PAYÉES à l'achat. `total`
--    peut grandir quand le coach offre des séances (geste commercial) ; les
--    prorata (remboursement du reste, libération séance par séance) doivent
--    se calculer sur les séances payées, jamais sur les offertes.
-- 3. Lignes payments encore sous séquestre étiquetées Essentiel alors que
--    le coach était Pro par accès offert au moment du paiement : réalignées
--    (rien n'a encore été versé sur ces lignes, aucun montant historique
--    n'est touché).
-- À exécuter dans Supabase → SQL Editor → Run (après 0065).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Vues publiques : Pro effectif (abonnement OU accès offert) ───────────
drop view if exists public.public_coaches cascade;
create view public.public_coaches as
  select c.id, c.slug, c.first_name, c.last_name, c.specialty, c.bio,
         c.avatar_url, c.city, c.accepts_online, c.lat, c.lng,
         c.stripe_charges_enabled, c.cancellation_policy, c.booking_mode,
         c.refund_over_24h_pct, c.refund_under_24h_pct,
         c.created_at, c.sport, c.specialties, c.venues, c.gym_name,
         c.rating_avg, c.rating_count,
         (select min(s.price_cents) from public.services s
           where s.coach_id = c.id and s.active = true) as from_price_cents,
         (c.verification_status = 'verified') as verified,
         c.cancel_hours,
         c.installments_enabled,
         (greatest(coalesce(c.pro_until, '-infinity'::timestamptz),
                   coalesce(c.pro_bonus_until, '-infinity'::timestamptz)) > now()) as pro
    from public.coaches c
   where c.listed = true
     and c.slug is not null
     and c.avatar_url is not null
     and c.stripe_charges_enabled = true
     and exists (select 1 from public.services s
                  where s.coach_id = c.id and s.active = true)
     and exists (select 1 from public.availabilities a
                  where a.coach_id = c.id);
grant select on public.public_coaches to anon, authenticated;

-- Recherche par rayon (recréée : le cascade l'a supprimée).
create or replace function public.search_coaches_nearby(
  p_lat         double precision,
  p_lng         double precision,
  p_radius_km   double precision,
  p_online_only boolean default false
) returns setof public.public_coaches
language sql
stable
set search_path = public
as $$
  with candidates as (
    select pc.*,
           6371 * 2 * asin(sqrt(
             power(sin(radians(pc.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(pc.lat)) *
             power(sin(radians(pc.lng - p_lng) / 2), 2)
           )) as dist_km
      from public.public_coaches pc
     where pc.lat is not null
       and pc.lng is not null
       and (not p_online_only or pc.accepts_online)
       and pc.lat between p_lat - (p_radius_km / 111.0)
                      and p_lat + (p_radius_km / 111.0)
       and pc.lng between p_lng - (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
                      and p_lng + (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
  )
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode,
         refund_over_24h_pct, refund_under_24h_pct, created_at,
         sport, specialties, venues, gym_name, rating_avg, rating_count,
         from_price_cents, verified, cancel_hours, installments_enabled, pro
    from candidates
   where dist_km <= p_radius_km
   order by dist_km
   limit 60
$$;

grant execute on function public.search_coaches_nearby(
  double precision, double precision, double precision, boolean
) to anon, authenticated;

create or replace view public.public_services as
  select
    s.id,
    s.coach_id,
    s.name,
    s.description,
    s.type,
    s.location,
    s.duration_min,
    s.price_cents,
    s.currency,
    s.pack_size,
    s.validity_days,
    s.cancel_hours
  from public.services s
  join public.coaches c on c.id = s.coach_id
  where s.active = true
    and c.listed = true
    and (s.type <> 'pack'
         or greatest(coalesce(c.pro_until, '-infinity'::timestamptz),
                     coalesce(c.pro_bonus_until, '-infinity'::timestamptz)) > now());
grant select on public.public_services to anon, authenticated;

-- ── 2. Séances payées d'un pack ─────────────────────────────────────────────
alter table public.pack_credits
  add column if not exists paid_total int;

-- Rétro-remplissage : le mouvement « purchase » du journal porte la taille
-- du pack à l'achat ; à défaut, le total courant.
update public.pack_credits pc
   set paid_total = coalesce(
         (select e.delta from public.credit_events e
           where e.pack_credit_id = pc.id and e.reason = 'purchase'
           order by e.created_at asc limit 1),
         pc.total)
 where pc.paid_total is null;

alter table public.pack_credits
  alter column paid_total set not null,
  alter column paid_total set default 0;

-- Ouverture d'un pack : paid_total = taille achetée (jamais modifié ensuite,
-- les séances offertes n'augmentent que `total`).
create or replace function public.pack_credit_open(
  p_coach uuid, p_client uuid, p_service uuid, p_payment uuid, p_booking uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s record;
  v_id uuid;
begin
  select name, price_cents, pack_size, validity_days, cancel_hours into s
    from services where id = p_service and coach_id = p_coach;
  if s is null or coalesce(s.pack_size, 0) < 2 then return null; end if;

  insert into pack_credits
    (coach_id, client_id, service_id, payment_id, total, paid_total, used, status,
     expires_at, service_name, price_cents, cancel_hours)
  values
    (p_coach, p_client, p_service, p_payment, s.pack_size, s.pack_size, 0, 'active',
     case when s.validity_days is null then null
          else now() + make_interval(days => s.validity_days) end,
     s.name, s.price_cents, coalesce(s.cancel_hours, 24))
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from pack_credits where payment_id = p_payment;
    return v_id;
  end if;

  perform pack_credit_log(v_id, null, s.pack_size, 'purchase', 'client', null);
  if p_booking is not null then
    update pack_credits set used = 1 where id = v_id;
    update bookings set pack_credit_id = v_id where id = p_booking;
    perform pack_credit_log(v_id, p_booking, -1, 'booking', 'client', null);
  end if;
  return v_id;
end;
$$;

-- ── 3. Lignes sous séquestre d'un coach Pro par accès offert ────────────────
-- Le rétro-remplissage de 0064 ne regardait que pro_until. Seules les lignes
-- pas encore versées sont réalignées : le taux figé sert au versement à venir.
update public.payments p
   set plan = 'pro',
       fee_rate_bps = 300
  from public.coaches c
 where c.id = p.coach_id
   and p.plan = 'essential'
   and p.escrow_status in ('held', 'authorized')
   and c.pro_bonus_until is not null
   and c.pro_bonus_until > coalesce(p.paid_at, p.created_at);
