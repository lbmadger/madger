-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Suites de l'audit SQL avant tests.
--
-- 1. coach_adjust_pack_credit : retirer une séance retire une séance OFFERTE
--    (total baisse), jamais une séance payée. L'ancienne version marquait la
--    séance comme consommée : le client perdait son remboursement au prorata
--    et l'argent finissait au coach.
-- 2. services : droits d'écriture PAR COLONNE pour le coach (règle du
--    projet), au lieu du droit table entier hérité de Supabase.
-- 3. coaches.verification_status : un coach ne peut poser que 'none' ou
--    'pending' ; 'verified' / 'rejected' restent réservés à l'admin.
-- 4. Codes promo : le mois offert va dans pro_bonus_until (accès OFFERT),
--    comme le parrainage, et plus dans pro_until (réservé à l'abonnement).
-- 5. public_coaches.from_price_cents ignore les packs d'un coach Essentiel
--    (masqués sur sa page) : « à partir de » ne pointe plus sur une offre
--    invisible. Recréée SANS drop : la fonction search_coaches_nearby reste.
-- 6. Révocations de cohérence (fonctions et tables écrites côté serveur).
-- À exécuter dans Supabase → SQL Editor → Run (après 0066).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Ajustement des crédits d'un pack par le coach ────────────────────────
create or replace function public.coach_adjust_pack_credit(
  p_pack uuid, p_delta int, p_note text
) returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_rem int;
begin
  select coach_id, total, paid_total, used, status into r
    from pack_credits where id = p_pack for update;
  if r is null or r.coach_id is distinct from auth.uid() then
    raise exception 'not_found';
  end if;
  if r.status <> 'active' then raise exception 'pack_inactive'; end if;
  if p_delta = 0 then return r.total - r.used; end if;
  if p_delta > 0 then
    update pack_credits
       set total = total + p_delta, updated_at = now() where id = p_pack;
    perform pack_credit_log(p_pack, null, p_delta, 'coach_gift', 'coach', p_note);
  else
    -- On ne retire que des séances offertes, jamais en dessous des séances
    -- payées ni des séances déjà réservées.
    if r.total + p_delta < greatest(r.used, coalesce(r.paid_total, 0)) then
      raise exception 'credit_negative';
    end if;
    update pack_credits
       set total = total + p_delta, updated_at = now() where id = p_pack;
    perform pack_credit_log(p_pack, null, p_delta, 'coach_adjust', 'coach', p_note);
  end if;
  select total - used into v_rem from pack_credits where id = p_pack;
  return v_rem;
end;
$$;
revoke execute on function public.coach_adjust_pack_credit(uuid, int, text) from public, anon;
grant execute on function public.coach_adjust_pack_credit(uuid, int, text) to authenticated;

-- ── 2. Prestations : droits par colonne ─────────────────────────────────────
revoke insert, update, delete on public.services from anon, authenticated;
grant select on public.services to anon, authenticated;
grant insert (coach_id, name, description, type, location, duration_min,
              price_cents, currency, pack_size, validity_days, cancel_hours, active),
      update (name, description, type, location, duration_min,
              price_cents, currency, pack_size, validity_days, cancel_hours, active),
      delete
  on public.services to authenticated;

-- ── 3. Statut de vérification : verified / rejected réservés à l'admin ──────
create or replace function public.guard_verification_status()
returns trigger language plpgsql as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status not in ('none', 'pending')
     and auth.uid() is not null then
    raise exception 'verification_admin_only';
  end if;
  return new;
end $$;

drop trigger if exists coaches_guard_verification on public.coaches;
create trigger coaches_guard_verification
  before update of verification_status on public.coaches
  for each row execute function public.guard_verification_status();

-- ── 4. Codes promo : mois offert dans pro_bonus_until ───────────────────────
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_row   public.promo_codes;
  v_new   timestamptz;
  v_uid   uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_row from promo_codes
   where lower(code) = lower(trim(p_code)) and active = true;
  if v_row.code is null then raise exception 'invalid_code'; end if;

  if v_row.max_uses is not null and v_row.used_count >= v_row.max_uses then
    raise exception 'code_exhausted';
  end if;

  if v_row.email is not null then
    select email into v_email from auth.users where id = v_uid;
    if v_email is null or lower(v_email) <> lower(v_row.email) then
      raise exception 'code_not_yours';
    end if;
  end if;

  -- Additif : s'empile sur un accès offert déjà en cours.
  select greatest(coalesce(pro_bonus_until, now()), now())
         + make_interval(months => v_row.months)
    into v_new
    from coaches where id = v_uid;
  if v_new is null then raise exception 'not_a_coach'; end if;

  update coaches set pro_bonus_until = v_new where id = v_uid;
  update promo_codes set used_count = used_count + 1 where code = v_row.code;
  return v_new;
end;
$$;
revoke execute on function public.redeem_promo(text) from public, anon;
grant execute on function public.redeem_promo(text) to authenticated;

-- ── 5. « À partir de » sans les packs masqués ───────────────────────────────
create or replace view public.public_coaches as
  select c.id, c.slug, c.first_name, c.last_name, c.specialty, c.bio,
         c.avatar_url, c.city, c.accepts_online, c.lat, c.lng,
         c.stripe_charges_enabled, c.cancellation_policy, c.booking_mode,
         c.refund_over_24h_pct, c.refund_under_24h_pct,
         c.created_at, c.sport, c.specialties, c.venues, c.gym_name,
         c.rating_avg, c.rating_count,
         (select min(s.price_cents) from public.services s
           where s.coach_id = c.id and s.active = true
             and (s.type <> 'pack'
                  or greatest(coalesce(c.pro_until, '-infinity'::timestamptz),
                              coalesce(c.pro_bonus_until, '-infinity'::timestamptz)) > now()))
           as from_price_cents,
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

-- ── 6. Révocations de cohérence ─────────────────────────────────────────────
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.client_subscriptions from anon, authenticated;
