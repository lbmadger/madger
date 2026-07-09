-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · État de lecture des conversations : chaque participant (coach et
-- client) mémorise la date de sa dernière lecture. Une conversation est
-- « non lue » si le dernier message est plus récent que cette date ET qu'il
-- n'a pas été envoyé par le participant lui-même. Base des badges non lus.
-- À exécuter dans Supabase → SQL Editor → Run (après 0040).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.conversations
  add column if not exists coach_last_read_at  timestamptz,
  add column if not exists client_last_read_at timestamptz;

-- La policy conversations_participant (0005) autorise déjà l'UPDATE par les
-- deux participants ; aucune restriction colonne sur conversations, donc
-- rien de plus à accorder. Ces colonnes ne portent aucune donnée sensible.
