-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Lieu des séances en extérieur : adresse (parc, stade, plage…) que
-- le coach indique dans ses réglages quand il coche « En extérieur ». Exposée
-- sur sa page publique et reprise dans les confirmations de séance quand il
-- n'a pas de salle. L'adresse de la salle est aussi exposée publiquement (un
-- client doit savoir où il va avant de payer).
-- À exécuter dans Supabase → SQL Editor → Run (après 0071).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.coaches
  add column if not exists outdoor_address text;

-- Écrite depuis les réglages (client authentifié) : grant par colonne.
grant update (outdoor_address) on public.coaches to authenticated;

-- Vue publique : mêmes colonnes qu'en 0070, plus les deux adresses à la fin
-- (create or replace n'accepte que des ajouts en fin de liste).
create or replace view public.public_coaches as
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
                   coalesce(c.pro_bonus_until, '-infinity'::timestamptz)) > now()) as pro,
         c.gym_address,
         c.outdoor_address
    from public.coaches c
   where c.listed = true
     and c.slug is not null
     and c.avatar_url is not null
     and c.stripe_charges_enabled = true
     and exists (select 1 from public.services s
                  where s.coach_id = c.id and s.active = true)
     and exists (select 1 from public.availabilities a
                  where a.coach_id = c.id);
