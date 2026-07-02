-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Mode de réservation (instantanée ou sur approbation)
-- À exécuter dans Supabase → SQL Editor → Run (après 0017).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Chaque coach choisit : 'instant' (le créneau est confirmé dès la demande /
-- le paiement) ou 'approval' (le coach valide chaque demande — défaut).

alter table public.coaches
  add column if not exists booking_mode text not null default 'approval';
do $$ begin
  alter table public.coaches
    add constraint coaches_booking_mode_chk
    check (booking_mode in ('instant','approval'));
exception when duplicate_object then null; end $$;

-- ── Vue publique : expose booking_mode (drop + create obligatoire) ──────────
drop view if exists public.public_coaches;
create view public.public_coaches as
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode, created_at
  from public.coaches
  where listed = true and slug is not null;
grant select on public.public_coaches to anon, authenticated;

-- ── request_booking : statut selon le mode du coach ─────────────────────────
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
  v_client  uuid;
  v_booking uuid;
begin
  select id, booking_mode into v_coach, v_mode
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

  if client_email is not null and length(trim(client_email)) > 0 then
    select id into v_client
      from clients
     where coach_id = v_coach and lower(email) = lower(trim(client_email))
     limit 1;
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
    starts_at + make_interval(mins => coalesce(duration_min, 60)),
    case when v_mode = 'instant' then 'confirmed'::booking_status
         else 'pending'::booking_status end,
    case when online then 'online' else 'in_person' end,
    nullif(trim(coalesce(message, '')), '')
  )
  returning id into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.request_booking(
  text, text, text, text, text, timestamptz, int, text, boolean
) to anon, authenticated;
