-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · App dashboard — Schéma initial
-- ───────────────────────────────────────────────────────────────────────────
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
-- Ne touche pas à la table `early_access` de la landing.
-- Idempotent autant que possible (create if not exists / drop policy if exists).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Types énumérés ─────────────────────────────────────────────────────────
do $$ begin
  create type service_type   as enum ('single','pack','subscription');
exception when duplicate_object then null; end $$;
do $$ begin
  create type location_kind  as enum ('in_person','online');
exception when duplicate_object then null; end $$;
do $$ begin
  create type booking_status as enum ('pending','confirmed','cancelled','completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_status as enum ('pending','paid','refunded','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type invoice_status as enum ('draft','issued');
exception when duplicate_object then null; end $$;

-- ── COACHES (profil, relation 1:1 avec auth.users) ─────────────────────────
create table if not exists public.coaches (
  id                   uuid primary key references auth.users(id) on delete cascade,
  created_at           timestamptz not null default now(),
  first_name           text,
  last_name            text,
  slug                 text unique,          -- madger.app/<slug>
  specialty            text,
  bio                  text,
  avatar_url           text,
  phone                text,
  locale               text not null default 'fr',
  timezone             text not null default 'Europe/Paris',
  stripe_account_id    text,                 -- Stripe Connect (Phase 4)
  onboarding_completed boolean not null default false
);

-- ── CLIENTS (les clients d'un coach) ───────────────────────────────────────
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name  text,
  email      text,
  phone      text,
  notes      text
);
create index if not exists clients_coach_id_idx on public.clients(coach_id);

-- ── SERVICES (prestations : séance à l'unité, pack, abonnement) ─────────────
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.coaches(id) on delete cascade,
  created_at   timestamptz not null default now(),
  name         text not null,
  description  text,
  type         service_type  not null default 'single',
  location     location_kind not null default 'in_person',
  duration_min int,
  price_cents  int not null default 0,
  currency     text not null default 'eur',
  pack_size    int,                          -- nb de séances si type = 'pack'
  active       boolean not null default true
);
create index if not exists services_coach_id_idx on public.services(coach_id);

-- ── AVAILABILITIES (disponibilités récurrentes hebdo) ──────────────────────
create table if not exists public.availabilities (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = dimanche
  start_time time not null,
  end_time   time not null,
  check (start_time < end_time)
);
create index if not exists availabilities_coach_id_idx on public.availabilities(coach_id);

-- ── BOOKINGS (séances) ─────────────────────────────────────────────────────
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.coaches(id) on delete cascade,
  client_id     uuid references public.clients(id)  on delete set null,
  service_id    uuid references public.services(id) on delete set null,
  created_at    timestamptz not null default now(),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        booking_status not null default 'pending',
  location      location_kind  not null default 'in_person',
  location_text text,
  meeting_url   text,                         -- lien Google Meet (Phase 4)
  notes         text
);
create index if not exists bookings_coach_id_idx  on public.bookings(coach_id);
create index if not exists bookings_starts_at_idx on public.bookings(starts_at);

-- ── PAYMENTS ───────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                       uuid primary key default gen_random_uuid(),
  coach_id                 uuid not null references public.coaches(id) on delete cascade,
  client_id                uuid references public.clients(id)  on delete set null,
  booking_id               uuid references public.bookings(id) on delete set null,
  service_id               uuid references public.services(id) on delete set null,
  created_at               timestamptz not null default now(),
  amount_cents             int not null,
  currency                 text not null default 'eur',
  status                   payment_status not null default 'pending',
  stripe_payment_intent_id text,
  paid_at                  timestamptz
);
create index if not exists payments_coach_id_idx on public.payments(coach_id);

-- ── INVOICES (conçu pour la future facturation électronique FR) ─────────────
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  client_id   uuid references public.clients(id)  on delete set null,
  payment_id  uuid references public.payments(id) on delete set null,
  created_at  timestamptz not null default now(),
  number      text,                           -- numérotation séquentielle
  issued_at   timestamptz,
  amount_cents int not null,
  currency    text not null default 'eur',
  pdf_url     text,
  status      invoice_status not null default 'draft'
);
create index if not exists invoices_coach_id_idx on public.invoices(coach_id);

-- ── Création auto du profil coach à l'inscription ──────────────────────────
-- Quand un utilisateur s'inscrit (auth.users), on crée sa ligne coaches vide.
-- L'onboarding la complètera ensuite.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.coaches (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- SÉCURITÉ : Row Level Security — chaque coach ne voit QUE ses données
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.coaches        enable row level security;
alter table public.clients        enable row level security;
alter table public.services       enable row level security;
alter table public.availabilities enable row level security;
alter table public.bookings       enable row level security;
alter table public.payments       enable row level security;
alter table public.invoices       enable row level security;

-- COACHES : accès à sa propre ligne uniquement.
drop policy if exists coaches_select_own on public.coaches;
create policy coaches_select_own on public.coaches
  for select using (auth.uid() = id);
drop policy if exists coaches_update_own on public.coaches;
create policy coaches_update_own on public.coaches
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists coaches_insert_self on public.coaches;
create policy coaches_insert_self on public.coaches
  for insert with check (auth.uid() = id);

-- TABLES ENFANTS : tout est autorisé tant que coach_id = utilisateur courant.
do $$
declare t text;
begin
  foreach t in array array['clients','services','availabilities','bookings','payments','invoices']
  loop
    execute format('drop policy if exists %I_owner_all on public.%I;', t, t);
    execute format(
      'create policy %I_owner_all on public.%I for all
         using (auth.uid() = coach_id) with check (auth.uid() = coach_id);',
      t, t
    );
  end loop;
end $$;
