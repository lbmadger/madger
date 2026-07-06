-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Créneaux bloqués par le coach (façon Airbnb)
-- À exécuter dans Supabase → SQL Editor → Run (après 0032).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un blocage est une ligne bookings sans client avec is_block = true : les
-- créneaux proposés aux clients et les contrôles anti-chevauchement
-- l'excluent déjà naturellement (statut confirmé).

alter table public.bookings
  add column if not exists is_block boolean not null default false;
