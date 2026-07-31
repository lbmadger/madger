-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Campagnes email liste d'attente : suivi d'envoi par inscrit
-- À exécuter dans Supabase → SQL Editor → Run (après 0049).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Deux emails de nurturing avant lancement (« voilà ce qu'on construit »,
-- « les coulisses ») : un horodatage par campagne et par inscrit rend
-- l'envoi idempotent (rejouer le bouton n'envoie jamais deux fois).
-- Écrit uniquement par le service role : aucun grant client nécessaire.

alter table public.early_access
  add column if not exists intro_sent_at timestamptz;

alter table public.early_access
  add column if not exists story_sent_at timestamptz;
