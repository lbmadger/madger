-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Correctif : request_booking échouait (« column "location" is of
-- type location_kind but expression is of type text »).
-- À exécuter dans Supabase → SQL Editor → Run (après 0027).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le CASE sur le lieu renvoyait du texte au lieu du type énuméré
-- location_kind : TOUTES les demandes de réservation gratuites échouaient.
-- Même fonction que 0024, avec le cast manquant.

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
  v_ends    timestamptz;
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

  v_ends := starts_at + make_interval(mins => coalesce(duration_min, 60));

  if exists (
    select 1 from bookings b
     where b.coach_id = v_coach
       and b.status in ('pending', 'confirmed')
       and b.starts_at < v_ends
       and b.ends_at   > request_booking.starts_at
  ) then
    raise exception 'slot_taken';
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
