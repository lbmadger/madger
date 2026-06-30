-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Marketplace — profil public coach & recherche par ville
-- À exécuter dans Supabase → SQL Editor → Run (après 0001).
-- ═══════════════════════════════════════════════════════════════════════════

-- Champs marketplace sur le profil coach.
alter table public.coaches add column if not exists city text;
alter table public.coaches
  add column if not exists accepts_online boolean not null default false;
-- `listed` : le coach apparaît sur la marketplace (mis à true à la fin de
-- l'onboarding, quand le profil est présentable).
alter table public.coaches
  add column if not exists listed boolean not null default false;

-- Recherche par ville insensible à la casse / aux accents → index sur une
-- version normalisée.
create index if not exists coaches_city_idx on public.coaches (lower(city));

-- ── Vue publique ───────────────────────────────────────────────────────────
-- Exposée aux visiteurs NON connectés (rôle anon). Elle ne révèle QUE les
-- colonnes publiques et seulement les coachs `listed`. Les colonnes sensibles
-- (téléphone, stripe_account_id, email d'auth…) ne sont jamais exposées : on
-- ne les sélectionne tout simplement pas ici. La vue (propriété du rôle qui
-- exécute la migration) court-circuite la RLS de la table de base, ce qui est
-- voulu — la sélection de colonnes ci-dessous EST la frontière de sécurité.
create or replace view public.public_coaches as
  select
    id,
    slug,
    first_name,
    last_name,
    specialty,
    bio,
    avatar_url,
    city,
    accepts_online,
    created_at
  from public.coaches
  where listed = true and slug is not null;

grant select on public.public_coaches to anon, authenticated;
