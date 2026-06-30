-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Messagerie — noms dénormalisés sur la conversation
-- À exécuter dans Supabase → SQL Editor → Run (après 0006).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La RLS empêche un client de lire la table `coaches` (et inversement le coach
-- de lire le profil auth d'un client). Pour afficher le nom de l'autre dans la
-- messagerie sans casser ce cloisonnement, on stocke les noms d'affichage
-- directement sur la conversation (renseignés à la création, lisibles par les
-- deux participants via la RLS de `conversations`).

alter table public.conversations add column if not exists coach_name  text;
alter table public.conversations add column if not exists client_name text;
