-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Rappel « 1 h avant » la séance (distinct du rappel « demain »)
-- À exécuter dans Supabase → SQL Editor → Run (après 0044).
-- ═══════════════════════════════════════════════════════════════════════════
-- Un second rappel, juste avant la séance. Colonne dédiée pour ne pas se
-- mélanger avec reminder_sent_at (le rappel de la veille).

alter table public.bookings
  add column if not exists reminder_soon_sent_at timestamptz;

create index if not exists bookings_reminder_soon_idx
  on public.bookings(status, starts_at, reminder_soon_sent_at);
