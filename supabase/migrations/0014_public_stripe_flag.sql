-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Expose "peut encaisser" (Stripe) sur la fiche publique du coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0013).
-- ═══════════════════════════════════════════════════════════════════════════
-- On ajoute stripe_charges_enabled à la vue publique (drop+create obligatoire).

drop view if exists public.public_coaches;
create view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled, created_at
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;
