-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Suivi d'envoi des codes promo (email au lancement)
-- À exécuter dans Supabase → SQL Editor → Run (après 0011).
-- ═══════════════════════════════════════════════════════════════════════════

-- Marque un code comme envoyé à son membre (évite les doublons d'email).
alter table public.promo_codes add column if not exists sent_at timestamptz;
