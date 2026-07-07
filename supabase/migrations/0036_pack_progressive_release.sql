-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Packs : libération des fonds séance par séance
-- À exécuter dans Supabase → SQL Editor → Run (après 0035).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un pack payé n'est plus versé intégralement au coach 24 h après la
-- PREMIÈRE séance : la part de chaque séance est versée au fil de la
-- consommation (séance passée + 24 h). Le reste demeure sous séquestre,
-- donc remboursable au prorata si le client annule en cours de pack.
-- `released_cents` = cumul déjà transféré au coach sur ce paiement.

alter table public.payments
  add column if not exists released_cents int not null default 0;
