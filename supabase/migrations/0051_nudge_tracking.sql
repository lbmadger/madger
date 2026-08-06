-- Madger · Relances onboarding : suivi en base (plus de fenêtre fragile)
-- À exécuter dans Supabase → SQL Editor → Run (après 0050).
-- Un cron sauté ne perd plus personne, un cron rejoué ne double plus rien.
alter table public.coaches
  add column if not exists onboarding_nudge1_at timestamptz;
alter table public.coaches
  add column if not exists onboarding_nudge2_at timestamptz;
