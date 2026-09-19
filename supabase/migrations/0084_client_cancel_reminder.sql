-- Relance du client 24 h après une demande d'annulation déclarée par le
-- coach restée sans réponse (cron reminders-soon). Une seule relance.
alter table public.bookings
  add column if not exists client_cancel_reminded_at timestamptz;
