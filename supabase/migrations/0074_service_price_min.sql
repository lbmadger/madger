-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Pas de prestation gratuite
-- À exécuter dans Supabase → SQL Editor → Run (après 0073).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Une prestation à 0 € serait réservable par n'importe qui, sans paiement
-- ni engagement. Minimum 1 €. NOT VALID : les lignes existantes ne sont pas
-- contrôlées (le coach corrige ou supprime), seules les nouvelles écritures
-- le sont.

alter table public.services
  drop constraint if exists services_price_min;
alter table public.services
  add constraint services_price_min check (price_cents >= 100) not valid;
