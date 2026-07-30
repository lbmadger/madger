-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Galerie Résultats : paires avant/après (2e photo par résultat)
-- À exécuter dans Supabase → SQL Editor → Run (après 0047).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un résultat peut porter deux photos : l'« avant » (url) et l'« après »
-- (url_after, facultative). Affichées côte à côte sur la page publique.

alter table public.coach_photos
  add column if not exists url_after text;

-- Grants par colonne : la nouvelle colonne doit être listée explicitement.
grant insert (url_after) on public.coach_photos to authenticated;
grant update (url_after) on public.coach_photos to authenticated;
