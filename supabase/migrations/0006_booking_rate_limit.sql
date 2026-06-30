-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement anti-abus de la réservation publique
-- À exécuter dans Supabase → SQL Editor → Run (après 0005).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `request_booking` est appelable par des visiteurs non connectés (anon). On
-- ajoute des plafonds EN BASE, qui ne peuvent pas être contournés (même en
-- appelant la fonction directement) :
--   • max 20 demandes 'pending' par coach sur 1 h  → protège chaque coach du flood
--   • max 5 demandes 'pending' actives par client  → empêche le spam répété
-- C'est un create-or-replace : ça remplace simplement la version de 0003.

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
  v_client  uuid;
  v_booking uuid;
  v_recent  int;
  v_pending int;
begin
  select id into v_coach from coaches where slug = coach_slug and listed = true;
  if v_coach is null then raise exception 'coach_not_found'; end if;

  if client_first_name is null or length(trim(client_first_name)) = 0 then raise exception 'name_required'; end if;
  if starts_at is null then raise exception 'date_required'; end if;
  if starts_at < now() then raise exception 'date_in_past'; end if;

  -- Limites de longueur (anti-payload géant).
  if length(client_first_name) > 80
     or length(coalesce(client_last_name, '')) > 80
     or length(coalesce(client_email, '')) > 254
     or length(coalesce(client_phone, '')) > 30
     or length(coalesce(message, '')) > 2000 then
    raise exception 'invalid_input';
  end if;

  -- Plafond par coach : pas plus de 20 demandes en attente sur la dernière heure.
  select count(*) into v_recent
    from bookings
   where coach_id = v_coach and status = 'pending'
     and created_at > now() - interval '1 hour';
  if v_recent >= 20 then raise exception 'rate_limited'; end if;

  -- Réutilise le client existant (même email) sinon le crée.
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
      v_coach, trim(client_first_name),
      nullif(trim(coalesce(client_last_name, '')), ''),
      nullif(trim(coalesce(client_email, '')), ''),
      nullif(trim(coalesce(client_phone, '')), '')
    )
    returning id into v_client;
  end if;

  insert into bookings (coach_id, client_id, starts_at, ends_at, status, location, notes)
  values (
    v_coach, v_client, starts_at,
    starts_at + make_interval(mins => coalesce(duration_min, 60)),
    'pending', case when online then 'online' else 'in_person' end,
    nullif(trim(coalesce(message, '')), '')
  )
  returning id into v_booking;

  return v_booking;
end;
$$;
