-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Google Calendar + Meet (connexion du compte Google du coach)
-- À exécuter dans Supabase → SQL Editor → Run (après 0026).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le coach connecte son compte Google depuis les réglages : les séances en
-- visio créent alors un événement dans SON agenda avec un vrai lien Google
-- Meet, envoyé au client. L'événement est supprimé si la séance est annulée.

alter table public.coaches
  add column if not exists google_refresh_token text,
  add column if not exists google_connected_at timestamptz;

alter table public.bookings
  add column if not exists google_event_id text;
