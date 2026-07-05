-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Modèle Airbnb/Doctolib : empreinte bancaire à la demande, débit à
-- l'acceptation du coach, délai minimum de réservation choisi par le coach.
-- À exécuter dans Supabase → SQL Editor → Run (après 0028).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Délai minimum de réservation (heures avant la séance) ────────────────
alter table public.coaches
  add column if not exists min_notice_hours int not null default 2;
do $$ begin
  alter table public.coaches
    add constraint coaches_min_notice_chk
    check (min_notice_hours in (1, 2, 6, 12, 24, 48));
exception when duplicate_object then null; end $$;

-- ── 2. Paiement « autorisé » (empreinte bancaire, pas encore débité) ────────
alter type payment_status add value if not exists 'canceled';

alter table public.payments drop constraint if exists payments_escrow_status_chk;
alter table public.payments add constraint payments_escrow_status_chk
  check (escrow_status in ('authorized','held','released','refunded','disputed','canceled'));

-- ── 3. request_booking : applique le délai minimum du coach ─────────────────
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
