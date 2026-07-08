-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Salle de sport VALIDÉE du coach : en plus du nom libre (gym_name),
-- la salle choisie dans la recherche (OpenStreetMap) est enregistrée avec son
-- adresse et ses coordonnées. Base de la future carte des coachs.
-- À exécuter dans Supabase → SQL Editor → Run (après 0038).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.coaches
  add column if not exists gym_place_id text,
  add column if not exists gym_address  text,
  add column if not exists gym_lat      double precision,
  add column if not exists gym_lng      double precision;

-- Le coach modifie sa salle depuis ses réglages (grants colonne, cf. 0035).
grant update (gym_place_id, gym_address, gym_lat, gym_lng)
  on public.coaches to authenticated;
