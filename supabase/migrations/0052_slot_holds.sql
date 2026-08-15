-- Madger · Verrou de créneau pendant le paiement
-- À exécuter dans Supabase → SQL Editor → Run (après 0051).
--
-- Quand un client lance le paiement d'un créneau, le créneau est verrouillé
-- 15 minutes : un second client ne peut ni le voir dans les disponibilités
-- ni ouvrir un paiement dessus. Sans ce verrou, deux clients pouvaient payer
-- le même créneau en même temps (le second était remboursé automatiquement,
-- correct mais pénible). Écrit uniquement par le service role : aucune
-- policy, aucun grant client.

create table if not exists public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

-- Deux paiements lancés au même instant sur le même créneau : l'index
-- unique tranche, le second reçoit « créneau pris ».
create unique index if not exists slot_holds_coach_start
  on public.slot_holds (coach_id, starts_at);
create index if not exists slot_holds_created
  on public.slot_holds (created_at);

alter table public.slot_holds enable row level security;
