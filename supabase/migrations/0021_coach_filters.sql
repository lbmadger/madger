-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Sport, types d'accompagnement et lieux d'exercice du coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0020).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Alimente les filtres de la marketplace : le coach choisit son sport, ses
-- types d'accompagnement (mêmes clés que les objectifs clients) et ses lieux
-- d'exercice (sa salle — avec son nom, à domicile, extérieur, visio).

alter table public.coaches
  add column if not exists sport        text,
  add column if not exists specialties  text[] not null default '{}',
  add column if not exists venues       text[] not null default '{}',
  add column if not exists gym_name     text;

-- ── Vue publique (drop + create obligatoire pour insérer des colonnes) ──────
drop view if exists public.public_coaches;
create view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode, created_at,
         sport, specialties, venues, gym_name,
         (select round(avg(r.rating)::numeric, 1)
            from public.reviews r where r.coach_id = coaches.id) as rating_avg,
         (select count(*)::int
            from public.reviews r where r.coach_id = coaches.id) as rating_count
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;
