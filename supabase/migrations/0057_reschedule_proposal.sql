-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Lot 1 : report de séance par le coach soumis au client, et
-- notifications client étendues.
-- À exécuter dans Supabase → SQL Editor → Run (après 0056).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Quand le coach déplace une séance confirmée, la séance est déplacée tout de
-- suite (le coach reste maître de son agenda) mais le client est invité à
-- CONFIRMER le nouvel horaire ou à en CHOISIR UN AUTRE dans ses créneaux.
-- Sans réponse sous 48 h, le nouvel horaire est validé automatiquement (le
-- cron efface la proposition en attente).

alter table public.bookings
  add column if not exists reschedule_pending_until timestamptz,
  add column if not exists rescheduled_from timestamptz;

create index if not exists bookings_reschedule_pending_idx
  on public.bookings (reschedule_pending_until)
  where reschedule_pending_until is not null;

-- Facture / avoir envoyés par email au client (PDF en pièce jointe) : un
-- seul envoi par pièce, réclamé conditionnellement (le webhook et le retour
-- navigateur peuvent tous deux déclencher l'émission).
alter table public.invoices
  add column if not exists emailed_at timestamptz;

-- Notifications de la cloche client : nouveaux types.
alter table public.client_notifications
  drop constraint if exists client_notifications_type_check;
alter table public.client_notifications
  add constraint client_notifications_type_check
  check (type in (
    'cancelled', 'declined', 'rescheduled', 'accepted',
    'booked', 'invoice', 'credit_note', 'pack_low', 'pack_empty', 'pack_expiring'
  ));
