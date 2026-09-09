-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Photo de profil du client
-- À exécuter dans Supabase → SQL Editor → Run (après 0072).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le client ajoute une photo depuis son profil (bucket public « avatars »,
-- dossier avatars/<uid>/, mêmes règles que les coachs). L'URL vit sur son
-- profil ; le coach la voit sur la fiche client (lecture déjà ouverte par
-- client_profiles_coach_read).

alter table public.client_profiles
  add column if not exists avatar_url text;
