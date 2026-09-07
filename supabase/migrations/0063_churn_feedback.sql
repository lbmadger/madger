-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Parcours de résiliation Pro : raison du départ, geste de
-- rétention unique, arrêt en fin de période réactivable.
-- À exécuter dans Supabase → SQL Editor → Run (après 0062).
-- ═══════════════════════════════════════════════════════════════════════════

-- Pourquoi un coach arrête Pro : la donnée produit la plus utile qui soit.
create table if not exists public.churn_feedback (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  reason     text not null,
  details    text,
  plan       text,
  outcome    text not null default 'cancelled'
             check (outcome in ('cancelled', 'stayed', 'offer_accepted')),
  created_at timestamptz not null default now()
);
create index if not exists churn_feedback_coach_idx
  on public.churn_feedback (coach_id, created_at desc);
alter table public.churn_feedback enable row level security;
-- Écrit par le service role uniquement (route serveur), lu par l'admin.
revoke all on public.churn_feedback from anon, authenticated;

alter table public.coaches
  -- Geste de rétention (1 mois offert) : une seule fois par coach.
  add column if not exists retention_offer_used_at timestamptz,
  -- Abonnement arrêté en fin de période : date d'arrêt (réactivable avant).
  add column if not exists subscription_cancel_at timestamptz;
