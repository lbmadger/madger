-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Séquestre des paiements + politiques d'annulation
-- À exécuter dans Supabase → SQL Editor → Run (après 0015).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Nouveau modèle : le client paie → l'argent est RETENU par Madger (charge sur
-- le compte plateforme) → libéré au coach 24 h après la séance si rien n'est
-- signalé. En cas d'annulation, un % de remboursement s'applique selon la
-- formule choisie par le coach. En cas de litige, les fonds sont gelés jusqu'à
-- décision d'un admin.

-- ── Politique d'annulation choisie par le coach ─────────────────────────────
alter table public.coaches
  add column if not exists cancellation_policy text not null default 'moderate';
do $$ begin
  alter table public.coaches
    add constraint coaches_cancellation_policy_chk
    check (cancellation_policy in ('flexible','moderate','strict'));
exception when duplicate_object then null; end $$;

-- ── Cycle de vie du séquestre sur chaque paiement ───────────────────────────
alter table public.payments
  add column if not exists stripe_charge_id    text,
  add column if not exists stripe_transfer_id  text,
  add column if not exists stripe_fee_cents     int,
  add column if not exists commission_cents     int,
  add column if not exists payout_cents         int,
  add column if not exists refunded_cents       int not null default 0,
  add column if not exists escrow_status        text not null default 'held',
  add column if not exists release_after        timestamptz,
  add column if not exists released_at           timestamptz,
  add column if not exists disputed_at           timestamptz,
  add column if not exists dispute_reason        text,
  add column if not exists resolved_at           timestamptz;
do $$ begin
  alter table public.payments
    add constraint payments_escrow_status_chk
    check (escrow_status in ('held','released','refunded','disputed','canceled'));
exception when duplicate_object then null; end $$;

-- Index pour le job de libération automatique (fonds mûrs, non gelés).
create index if not exists payments_release_idx
  on public.payments(escrow_status, release_after);

-- ── Vue publique : expose la politique d'annulation du coach ────────────────
drop view if exists public.public_coaches;
create view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, created_at
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;
