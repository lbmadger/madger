-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Politique d'annulation personnalisée : le coach règle DEUX
-- pourcentages indépendants au lieu de choisir une formule toute faite.
--  - refund_over_24h_pct  : % remboursé au client s'il annule PLUS de 24 h
--    avant le début de la séance ;
--  - refund_under_24h_pct : % remboursé s'il annule MOINS de 24 h avant.
-- Les anciennes formules (flexible/moderate/strict) sont converties en
-- pourcentages ; la colonne cancellation_policy reste en place (lecture
-- seule, plus jamais écrite par l'app).
-- À exécuter dans Supabase → SQL Editor → Run (après 0037).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes + reprise des formules existantes ────────────────────────────
alter table public.coaches
  add column if not exists refund_over_24h_pct  int,
  add column if not exists refund_under_24h_pct int;

update public.coaches
   set refund_over_24h_pct = case cancellation_policy
                               when 'flexible' then 100
                               when 'strict'   then 50
                               else 75
                             end,
       refund_under_24h_pct = case cancellation_policy
                                when 'flexible' then 50
                                else 0
                              end
 where refund_over_24h_pct is null
    or refund_under_24h_pct is null;

alter table public.coaches
  alter column refund_over_24h_pct  set default 75,
  alter column refund_over_24h_pct  set not null,
  alter column refund_under_24h_pct set default 0,
  alter column refund_under_24h_pct set not null;

do $$ begin
  alter table public.coaches
    add constraint coaches_refund_over_chk
    check (refund_over_24h_pct between 0 and 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.coaches
    add constraint coaches_refund_under_chk
    check (refund_under_24h_pct between 0 and 100);
exception when duplicate_object then null; end $$;

-- ── 2. Le coach peut modifier ses deux pourcentages (grants colonne 0035) ────
grant update (refund_over_24h_pct, refund_under_24h_pct)
  on public.coaches to authenticated;

-- ── 3. Vue publique : expose les deux pourcentages ───────────────────────────
drop view if exists public.public_coaches cascade;
create view public.public_coaches as
  select c.id, c.slug, c.first_name, c.last_name, c.specialty, c.bio,
         c.avatar_url, c.city, c.accepts_online, c.lat, c.lng,
         c.stripe_charges_enabled, c.cancellation_policy, c.booking_mode,
         c.refund_over_24h_pct, c.refund_under_24h_pct,
         c.created_at, c.sport, c.specialties, c.venues, c.gym_name,
         c.rating_avg, c.rating_count
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

-- Recherche par rayon (recréée : le cascade ci-dessus l'a supprimée).
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
         sport, specialties, venues, gym_name, rating_avg, rating_count
    from candidates
   where dist_km <= p_radius_km
   order by dist_km
   limit 60
$$;

grant execute on function public.search_coaches_nearby(
  double precision, double precision, double precision, boolean
) to anon, authenticated;
