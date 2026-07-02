-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Avis clients sur les coachs (note 1-5 + commentaire)
-- À exécuter dans Supabase → SQL Editor → Run (après 0019).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Règle produit : 1 CLIENT = 1 AVIS par coach (pas 1 avis par séance). La
-- contrainte unique (coach_id, client_id) le garantit en base : si le client
-- re-note après une nouvelle séance, son avis précédent est remplacé.
-- L'écriture passe uniquement par l'API (service role) qui vérifie que la
-- séance est passée et que l'email correspond au client de la réservation.

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  rating     int  not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_id)              -- ← 1 client = 1 avis
);
create index if not exists reviews_coach_idx on public.reviews(coach_id);

-- RLS : pas d'écriture publique (API service role uniquement). Le coach peut
-- lire ses avis ; le public lit via la vue public_reviews.
alter table public.reviews enable row level security;
drop policy if exists reviews_coach_read on public.reviews;
create policy reviews_coach_read on public.reviews
  for select using (auth.uid() = coach_id);

-- ── Vue publique des avis (prénom du client uniquement) ─────────────────────
drop view if exists public.public_reviews;
create view public.public_reviews as
  select r.id, r.coach_id, r.rating, r.comment, r.created_at,
         c.first_name as client_first_name
  from public.reviews r
  join public.clients c on c.id = r.client_id;
grant select on public.public_reviews to anon, authenticated;

-- ── Vue publique des coachs : note moyenne + nombre d'avis ──────────────────
drop view if exists public.public_coaches;
create view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode, created_at,
         (select round(avg(r.rating)::numeric, 1)
            from public.reviews r where r.coach_id = coaches.id) as rating_avg,
         (select count(*)::int
            from public.reviews r where r.coach_id = coaches.id) as rating_count
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;
