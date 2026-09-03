-- Relance d'avis unique à J+3 : une colonne de suivi sur la réservation,
-- écrite uniquement par le cron (service role). Aucun grant client requis.
alter table public.bookings
  add column if not exists review_reminder_sent_at timestamptz;
