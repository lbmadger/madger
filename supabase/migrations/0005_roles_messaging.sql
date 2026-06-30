-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Rôles (coach/client) + Messagerie
-- À exécuter dans Supabase → SQL Editor → Run (après 0004).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Profils & rôles ────────────────────────────────────────────────────────
-- Chaque compte a un rôle. Un coach a EN PLUS une ligne `coaches`. Un client
-- n'a qu'un profil. Le rôle est transmis à l'inscription via les métadonnées
-- utilisateur (raw_user_meta_data.role), défaut 'client'.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'client' check (role in ('coach', 'client')),
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

-- Trigger d'inscription : crée le profil avec le bon rôle, et la ligne coach
-- UNIQUEMENT pour les coachs.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  if v_role = 'coach' then
    insert into public.coaches (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- Backfill : les comptes déjà créés (tous coachs jusqu'ici) reçoivent un profil
-- coach s'ils ont une ligne coaches, sinon client.
insert into public.profiles (id, role)
select c.id, 'coach' from public.coaches c
on conflict (id) do nothing;

-- ── Conversations ──────────────────────────────────────────────────────────
-- Une conversation lie un coach et un client (deux comptes auth). Unicité par
-- paire pour éviter les doublons.
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.coaches(id) on delete cascade,
  client_id       uuid not null references auth.users(id) on delete cascade,
  client_crm_id   uuid references public.clients(id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (coach_id, client_id)
);
create index if not exists conversations_coach_idx  on public.conversations(coach_id, last_message_at desc);
create index if not exists conversations_client_idx on public.conversations(client_id, last_message_at desc);

alter table public.conversations enable row level security;
drop policy if exists conversations_participant on public.conversations;
create policy conversations_participant on public.conversations
  for all
  using (auth.uid() = coach_id or auth.uid() = client_id)
  with check (auth.uid() = coach_id or auth.uid() = client_id);

-- ── Messages ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

-- Lecture : participant de la conversation.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.coach_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- Écriture : on est l'expéditeur ET participant de la conversation.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.coach_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- Met à jour last_message_at de la conversation à chaque message (tri des
-- conversations par activité récente).
create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.bump_conversation();
