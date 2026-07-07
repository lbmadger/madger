-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement 2 : plafonds anti-abus de request_booking (perdus par
-- les create or replace successifs 0018/0024/0029) + index pour le webhook
-- Stripe et le cron de libération des packs.
-- À exécuter dans Supabase → SQL Editor → Run (après 0036).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. request_booking : version 0029 + plafonds anti-abus de 0006 ──────────
-- La fonction est security definer et exécutable par anon : sans plafonds en
-- base, le rate-limit en mémoire de l'API est contournable en appelant
-- directement /rest/v1/rpc/request_booking avec la clé anon publique.
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

  -- Limites de longueur (anti-payload géant), reprises de 0006.
  if length(client_first_name) > 80
     or length(coalesce(client_last_name, '')) > 80
     or length(coalesce(client_email, '')) > 254
     or length(coalesce(client_phone, '')) > 30
     or length(coalesce(message, '')) > 2000 then
    raise exception 'invalid_input';
  end if;

  -- Plafond par coach : pas plus de 20 demandes en attente sur la dernière
  -- heure (anti déni de réservation sur les créneaux d'un coach).
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
  ) then
    raise exception 'slot_taken';
  end if;

  if client_email is not null and length(trim(client_email)) > 0 then
    select id into v_client
      from clients
     where coach_id = v_coach and lower(email) = lower(trim(client_email))
     limit 1;
  end if;

  -- Plafond par client : pas plus de 5 demandes en attente actives.
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

-- ── 2. Index webhook Stripe : charge.refunded / dispute ciblent la ligne par
-- stripe_charge_id (seq scan sinon, à chaque webhook).
create index if not exists payments_charge_idx
  on public.payments (stripe_charge_id)
  where stripe_charge_id is not null;

-- ── 3. Index cron packs : comptage des séances mûres par pack_credit_id
-- (répété pour chaque paiement pack de chaque lot du cron).
create index if not exists bookings_pack_credit_idx
  on public.bookings (pack_credit_id)
  where pack_credit_id is not null;
