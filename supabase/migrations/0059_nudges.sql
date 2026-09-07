-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Lot 3 : relances client (pack presque fini, pack fini, pack qui
-- expire) et alertes churn pour le coach. Suivi EN BASE : un cron sauté
-- rattrape au passage suivant, un cron rejoué ne double jamais.
-- À exécuter dans Supabase → SQL Editor → Run (après 0058).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.pack_credits
  add column if not exists low_notified_at timestamptz,
  add column if not exists empty_notified_at timestamptz,
  add column if not exists expiring_notified_at timestamptz,
  add column if not exists expiring_coach_notified_at timestamptz;

-- Alerte « client sans réservation depuis 14 jours » : datée pour ne
-- réalerter qu'après une nouvelle période d'activité.
alter table public.clients
  add column if not exists churn_alerted_at timestamptz;

create index if not exists pack_credits_expiring_idx
  on public.pack_credits (expires_at)
  where status = 'active' and expires_at is not null;
