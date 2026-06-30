-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Géolocalisation des coachs (recherche par ville + rayon)
-- À exécuter dans Supabase → SQL Editor → Run (après 0008).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- On stocke la latitude/longitude de la ville du coach (géocodée via
-- geo.api.gouv.fr au moment où il enregistre son profil). Permet la recherche
-- par rayon côté marketplace.

alter table public.coaches add column if not exists lat double precision;
alter table public.coaches add column if not exists lng double precision;

-- La vue publique expose aussi les coordonnées (pour le calcul de distance).
create or replace view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, created_at
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;
