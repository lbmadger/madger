-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Notifications instantanées
-- À exécuter dans Supabase → SQL Editor → Run (après 0030).
-- ═══════════════════════════════════════════════════════════════════════════

-- Anti-rafale : on n'envoie pas plus d'un email « nouveau message » par
-- destinataire et par conversation toutes les 30 minutes.
alter table public.conversations
  add column if not exists coach_notified_at  timestamptz,
  add column if not exists client_notified_at timestamptz;

-- La cloche du dashboard reçoit les nouvelles demandes en direct.
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
