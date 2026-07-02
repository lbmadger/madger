-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Profil sportif du client (poids, taille, objectifs → IMC)
-- À exécuter dans Supabase → SQL Editor → Run (après 0018).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Rempli à la création du compte client (parcours en 3 étapes). Le coach le
-- voit dans ses conversations : il sait à qui il a affaire et ce que la
-- personne recherche avant même la première séance.

create table if not exists public.client_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name  text,
  phone      text,
  birth_date date,
  sex        text check (sex in ('male','female','other')),
  height_cm  int check (height_cm between 100 and 250),
  weight_kg  numeric(5,1) check (weight_kg between 30 and 300),
  goals      text[] not null default '{}',
  level      text check (level in ('beginner','intermediate','advanced')),
  note       text,
  completed  boolean not null default false
);

alter table public.client_profiles enable row level security;

-- Le client gère SON profil.
drop policy if exists client_profiles_owner_all on public.client_profiles;
create policy client_profiles_owner_all on public.client_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Un coach peut LIRE le profil d'un client avec qui il a une conversation.
drop policy if exists client_profiles_coach_read on public.client_profiles;
create policy client_profiles_coach_read on public.client_profiles
  for select using (
    exists (
      select 1 from public.conversations c
       where c.client_id = client_profiles.id
         and c.coach_id  = auth.uid()
    )
  );
