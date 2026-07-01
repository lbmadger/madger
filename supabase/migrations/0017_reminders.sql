-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Rappels de séance (email J-1)
-- À exécuter dans Supabase → SQL Editor → Run (après 0016).
-- ═══════════════════════════════════════════════════════════════════════════
-- Marque l'envoi du rappel pour éviter les doublons (job planifié).

alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

create index if not exists bookings_reminder_idx
  on public.bookings(status, starts_at, reminder_sent_at);
