-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Notifications in-app côté client (cloche de l'espace client)
-- À exécuter dans Supabase → SQL Editor → Run (après 0053).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le coach a sa cloche (demandes en attente) ; le client n'avait que ses
-- emails. Cette table garde une trace des événements de séance qui le
-- concernent : annulation par le coach, demande refusée, séance déplacée,
-- demande acceptée. Écriture par le service role uniquement (les routes
-- serveur qui envoient déjà les emails) ; lecture et marquage « lu » par le
-- client connecté, rattaché par EMAIL (comme l'espace client lui-même).

create table if not exists public.client_notifications (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,                 -- email du client, en minuscules
  type       text not null check (type in ('cancelled','declined','rescheduled','accepted')),
  coach_name text,
  starts_at  timestamptz,                   -- horaire de la séance concernée
  booking_id uuid,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists client_notifications_email_idx
  on public.client_notifications(email, created_at desc);

alter table public.client_notifications enable row level security;

-- Lecture : uniquement ses propres notifications (email du compte connecté).
drop policy if exists client_notifications_select_own on public.client_notifications;
create policy client_notifications_select_own on public.client_notifications
  for select using (lower(coalesce(auth.email(), '')) = email);

-- Marquage « lu » : seule colonne modifiable, uniquement les siennes.
drop policy if exists client_notifications_read_own on public.client_notifications;
create policy client_notifications_read_own on public.client_notifications
  for update using (lower(coalesce(auth.email(), '')) = email)
  with check (lower(coalesce(auth.email(), '')) = email);

revoke all on public.client_notifications from anon, authenticated;
grant select on public.client_notifications to authenticated;
grant update (read_at) on public.client_notifications to authenticated;
