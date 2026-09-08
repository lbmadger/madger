-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Cours collectifs (lot 1).
--
-- - services.capacity : nombre de places d'une prestation (1 = individuelle,
--   2 à 50 = collective, prix PAR PERSONNE).
-- - services.group_service_id : pack collectif rattaché à une prestation
--   collective (lot 2 ; colonne posée dès maintenant).
-- - group_sessions : cours planifiés par le coach (date, places, prix
--   instantané). Un cours occupe le créneau dans l'agenda : plus de séance
--   individuelle possible à cette heure.
-- - bookings.group_session_id : la place d'un participant est une réservation
--   ordinaire (paiement, séquestre, facture, annulation par place).
-- - slot_holds.group_session_id : un verrou de paiement sur un cours ne
--   bloque plus les autres participants (index unique rendu partiel).
-- - group_seat_book : réservation d'une place ATOMIQUE (verrou de ligne,
--   comptage, refus « session_full ») réservée au service role.
-- - public_group_sessions : cours à venir avec places prises, pour la page
--   publique.
-- - request_booking et les vues publiques prennent en compte les cours.
-- À exécuter dans Supabase → SQL Editor → Run (après 0067).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Prestations : capacité et rattachement des packs collectifs ──────────
alter table public.services
  add column if not exists capacity smallint not null default 1,
  add column if not exists group_service_id uuid references public.services(id) on delete set null;

alter table public.services drop constraint if exists services_capacity_chk;
alter table public.services
  add constraint services_capacity_chk check (capacity between 1 and 50);

-- Un pack collectif référence une prestation collective DU MÊME coach ; une
-- prestation collective est forcément une séance simple.
create or replace function public.services_group_check()
returns trigger language plpgsql as $$
declare
  g record;
begin
  if new.capacity > 1 and new.type <> 'single' then
    raise exception 'group_requires_single';
  end if;
  if new.group_service_id is not null then
    if new.type <> 'pack' then
      raise exception 'group_link_requires_pack';
    end if;
    select coach_id, capacity, type into g
      from services where id = new.group_service_id;
    if g is null or g.coach_id <> new.coach_id or g.capacity < 2 or g.type <> 'single' then
      raise exception 'group_link_invalid';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists services_group_check on public.services;
create trigger services_group_check
  before insert or update of capacity, type, group_service_id on public.services
  for each row execute function public.services_group_check();

-- Droits par colonne (0067) étendus aux nouvelles colonnes.
grant insert (capacity, group_service_id), update (capacity, group_service_id)
  on public.services to authenticated;

-- ── 2. Cours collectifs ─────────────────────────────────────────────────────
create table if not exists public.group_sessions (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.coaches(id) on delete cascade,
  -- Prestation d'origine (peut être supprimée ensuite : instantané ci-dessous).
  service_id     uuid references public.services(id) on delete set null,
  name           text not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  capacity       smallint not null check (capacity between 1 and 50),
  price_cents    int not null default 0 check (price_cents >= 0),
  currency       text not null default 'eur',
  location       location_kind not null default 'in_person',
  location_text  text,
  meeting_url    text,
  notes          text,
  status         text not null default 'scheduled'
                 check (status in ('scheduled', 'cancelled')),
  -- Série hebdomadaire créée en une fois (même identifiant).
  series_id      uuid,
  cancelled_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (starts_at < ends_at)
);
create index if not exists group_sessions_coach_start_idx
  on public.group_sessions (coach_id, starts_at);
create index if not exists group_sessions_series_idx
  on public.group_sessions (series_id) where series_id is not null;

alter table public.group_sessions enable row level security;
drop policy if exists group_sessions_select_own on public.group_sessions;
create policy group_sessions_select_own on public.group_sessions
  for select using (auth.uid() = coach_id);
drop policy if exists group_sessions_insert_own on public.group_sessions;
create policy group_sessions_insert_own on public.group_sessions
  for insert with check (auth.uid() = coach_id);
drop policy if exists group_sessions_update_own on public.group_sessions;
create policy group_sessions_update_own on public.group_sessions
  for update using (auth.uid() = coach_id) with check (auth.uid() = coach_id);
-- Pas de suppression côté client : l'annulation (remboursements) passe par
-- l'API, qui pose status = 'cancelled'.
revoke all on public.group_sessions from anon, authenticated;
grant select on public.group_sessions to authenticated;
grant insert (coach_id, service_id, name, starts_at, ends_at, capacity,
              price_cents, currency, location, location_text, meeting_url,
              notes, series_id),
      update (name, starts_at, ends_at, capacity, location, location_text,
              meeting_url, notes, updated_at)
  on public.group_sessions to authenticated;

-- Un cours ne se crée ni ne se déplace sur une séance ou un autre cours.
create or replace function public.group_sessions_no_overlap()
returns trigger language plpgsql as $$
begin
  if new.status <> 'scheduled' then return new; end if;
  if exists (
    select 1 from group_sessions g
     where g.coach_id = new.coach_id and g.id <> new.id
       and g.status = 'scheduled'
       and g.starts_at < new.ends_at and g.ends_at > new.starts_at
  ) then
    raise exception 'slot_taken';
  end if;
  if exists (
    select 1 from bookings b
     where b.coach_id = new.coach_id
       and b.status in ('pending', 'confirmed')
       and (b.group_session_id is null or b.group_session_id <> new.id)
       and b.starts_at < new.ends_at and b.ends_at > new.starts_at
  ) then
    raise exception 'slot_taken';
  end if;
  return new;
end $$;

-- ── 3. Réservations : place dans un cours ───────────────────────────────────
alter table public.bookings
  add column if not exists group_session_id uuid references public.group_sessions(id) on delete set null;
create index if not exists bookings_group_session_idx
  on public.bookings (group_session_id) where group_session_id is not null;

-- Le trigger anti-chevauchement est posé APRÈS la colonne des réservations.
drop trigger if exists group_sessions_no_overlap on public.group_sessions;
create trigger group_sessions_no_overlap
  before insert or update of starts_at, ends_at, status on public.group_sessions
  for each row execute function public.group_sessions_no_overlap();

-- Verrou de paiement sur un cours : plusieurs participants peuvent payer en
-- même temps, seul le nombre de places compte.
alter table public.slot_holds
  add column if not exists group_session_id uuid references public.group_sessions(id) on delete cascade;
drop index if exists public.slot_holds_coach_start;
create unique index if not exists slot_holds_coach_start
  on public.slot_holds (coach_id, starts_at)
  where group_session_id is null;
create index if not exists slot_holds_group_idx
  on public.slot_holds (group_session_id) where group_session_id is not null;

-- Réservation atomique d'une place : verrou de ligne sur le cours, comptage
-- des places prises, refus si complet. Service role uniquement.
create or replace function public.group_seat_book(
  p_session uuid, p_client uuid, p_notes text, p_status text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s record;
  v_taken int;
  v_id uuid;
begin
  select * into s from group_sessions where id = p_session for update;
  if s is null or s.status <> 'scheduled' then
    raise exception 'session_unavailable';
  end if;
  if s.starts_at < now() then
    raise exception 'session_unavailable';
  end if;
  select count(*) into v_taken
    from bookings
   where group_session_id = p_session and status in ('pending', 'confirmed');
  if v_taken >= s.capacity then
    raise exception 'session_full';
  end if;
  -- Un même client ne prend pas deux places (double clic, double webhook).
  if p_client is not null and exists (
    select 1 from bookings
     where group_session_id = p_session and client_id = p_client
       and status in ('pending', 'confirmed')
  ) then
    raise exception 'already_booked';
  end if;
  insert into bookings
    (coach_id, client_id, service_id, group_session_id, starts_at, ends_at,
     status, location, location_text, meeting_url, notes)
  values
    (s.coach_id, p_client, s.service_id, p_session, s.starts_at, s.ends_at,
     coalesce(p_status, 'confirmed')::booking_status,
     s.location, s.location_text, s.meeting_url, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.group_seat_book(uuid, uuid, text, text)
  from public, anon, authenticated;

-- ── 4. Vue publique des cours à venir ───────────────────────────────────────
create or replace view public.public_group_sessions as
  select gs.id, gs.coach_id, gs.service_id, gs.name, gs.starts_at, gs.ends_at,
         gs.capacity, gs.price_cents, gs.currency, gs.location, gs.location_text,
         (select count(*)::int from public.bookings b
           where b.group_session_id = gs.id
             and b.status in ('pending', 'confirmed')) as seats_taken
    from public.group_sessions gs
    join public.coaches c on c.id = gs.coach_id
   where gs.status = 'scheduled'
     and gs.starts_at > now()
     and c.listed = true;
grant select on public.public_group_sessions to anon, authenticated;

-- Prestations publiques : capacité et rattachement exposés.
create or replace view public.public_services as
  select
    s.id,
    s.coach_id,
    s.name,
    s.description,
    s.type,
    s.location,
    s.duration_min,
    s.price_cents,
    s.currency,
    s.pack_size,
    s.validity_days,
    s.cancel_hours,
    s.capacity,
    s.group_service_id
  from public.services s
  join public.coaches c on c.id = s.coach_id
  where s.active = true
    and c.listed = true
    and (s.type <> 'pack'
         or greatest(coalesce(c.pro_until, '-infinity'::timestamptz),
                     coalesce(c.pro_bonus_until, '-infinity'::timestamptz)) > now());
grant select on public.public_services to anon, authenticated;

-- ── 5. Demande simple : un cours occupe aussi le créneau ────────────────────
create or replace function public.request_booking(
  coach_slug        text,
  client_first_name text,
  client_last_name  text,
  client_email      text,
  client_phone      text,
  starts_at         timestamptz,
  duration_min      int,
  message           text,
  online            boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach   uuid;
  v_mode    text;
  v_notice  int;
  v_client  uuid;
  v_booking uuid;
  v_ends    timestamptz;
  v_recent  int;
  v_pending int;
begin
  select id, booking_mode, coalesce(min_notice_hours, 2)
    into v_coach, v_mode, v_notice
    from coaches where slug = coach_slug and listed = true;
  if v_coach is null then
    raise exception 'coach_not_found';
  end if;

  if client_first_name is null or length(trim(client_first_name)) = 0 then
    raise exception 'name_required';
  end if;
  if starts_at is null then
    raise exception 'date_required';
  end if;
  if starts_at < now() then
    raise exception 'date_in_past';
  end if;
  if starts_at < now() + make_interval(hours => v_notice) then
    raise exception 'too_soon';
  end if;

  if length(client_first_name) > 80
     or length(coalesce(client_last_name, '')) > 80
     or length(coalesce(client_email, '')) > 254
     or length(coalesce(client_phone, '')) > 30
     or length(coalesce(message, '')) > 2000 then
    raise exception 'invalid_input';
  end if;

  select count(*) into v_recent
    from bookings
   where coach_id = v_coach and status = 'pending'
     and created_at > now() - interval '1 hour';
  if v_recent >= 20 then raise exception 'rate_limited'; end if;

  v_ends := starts_at + make_interval(mins => coalesce(duration_min, 60));

  if exists (
    select 1 from bookings b
     where b.coach_id = v_coach
       and b.status in ('pending', 'confirmed')
       and b.starts_at < v_ends
       and b.ends_at   > request_booking.starts_at
  ) or exists (
    select 1 from group_sessions g
     where g.coach_id = v_coach
       and g.status = 'scheduled'
       and g.starts_at < v_ends
       and g.ends_at   > request_booking.starts_at
  ) then
    raise exception 'slot_taken';
  end if;

  if client_email is not null and length(trim(client_email)) > 0 then
    select id into v_client
      from clients
     where coach_id = v_coach and lower(email) = lower(trim(client_email))
     limit 1;
  end if;

  if v_client is not null then
    select count(*) into v_pending
      from bookings
     where client_id = v_client and status = 'pending';
    if v_pending >= 5 then raise exception 'rate_limited'; end if;
  end if;

  if v_client is null then
    insert into clients (coach_id, first_name, last_name, email, phone)
    values (
      v_coach,
      trim(client_first_name),
      nullif(trim(coalesce(client_last_name, '')), ''),
      nullif(trim(coalesce(client_email, '')), ''),
      nullif(trim(coalesce(client_phone, '')), '')
    )
    returning id into v_client;
  end if;

  insert into bookings (coach_id, client_id, starts_at, ends_at, status, location, notes)
  values (
    v_coach,
    v_client,
    starts_at,
    v_ends,
    case when v_mode = 'instant' then 'confirmed'::booking_status
         else 'pending'::booking_status end,
    case when online then 'online'::location_kind
         else 'in_person'::location_kind end,
    nullif(trim(coalesce(message, '')), '')
  )
  returning id into v_booking;

  return v_booking;
end;
$$;
