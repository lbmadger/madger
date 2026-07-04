-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Abonnements mensuels des clients + messagerie temps réel
-- À exécuter dans Supabase → SQL Editor → Run (après 0025).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Abonnements clients (prestations de type « Abonnement ») ─────────────
-- L'argent va directement au coach à chaque échéance (transfert Stripe),
-- commission Madger en application fee. Cette table est le registre local :
-- écrite par le serveur (service role), lisible par le coach concerné.
create table if not exists public.client_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  coach_id               uuid not null references public.coaches(id) on delete cascade,
  client_id              uuid references public.clients(id) on delete set null,
  service_id             uuid references public.services(id) on delete set null,
  stripe_subscription_id text not null unique,
  status                 text not null default 'active',
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists client_subscriptions_coach_idx
  on public.client_subscriptions(coach_id);
create index if not exists client_subscriptions_client_idx
  on public.client_subscriptions(client_id);

alter table public.client_subscriptions enable row level security;
drop policy if exists client_subscriptions_coach_read on public.client_subscriptions;
create policy client_subscriptions_coach_read on public.client_subscriptions
  for select using (auth.uid() = coach_id);

-- ── 2. Messagerie temps réel ─────────────────────────────────────────────────
-- Publie les changements de `messages` sur le canal Realtime de Supabase :
-- les fils de discussion reçoivent les nouveaux messages instantanément
-- (RLS appliquée : seuls les participants reçoivent).
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
