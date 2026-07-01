-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Stripe Connect — état du compte connecté du coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0012).
-- ═══════════════════════════════════════════════════════════════════════════
-- stripe_account_id existe déjà (0001). On ajoute l'état "peut encaisser".

alter table public.coaches
  add column if not exists stripe_charges_enabled boolean not null default false;
