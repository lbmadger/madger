-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Réservation publique — demande de séance par un visiteur (invité)
-- À exécuter dans Supabase → SQL Editor → Run (après 0002).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un visiteur non connecté ne peut pas écrire dans `bookings`/`clients` (RLS).
-- Cette fonction `security definer` est le SEUL point d'entrée public : elle
-- crée une demande de séance (statut 'pending') pour un coach VISIBLE, et le
-- client associé dans le CRM du coach. Le périmètre est volontairement étroit
-- (aucune autre écriture possible), ce qui en fait la frontière de sécurité.

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
begin
  -- Le coach doit exister ET être visible sur la marketplace.
  select id into v_coach from coaches where slug = coach_slug and listed = true;
  if v_coach is null then
    raise exception 'coach_not_found';
  end if;

  if client_first_name is null or length(trim(client_first_name)) = 0 then
    raise exception 'name_required';
  end if;
  if starts_at is null then
    raise exception 'date_required';
  end if;
  -- Garde-fou anti-abus : pas de réservation dans le passé.
  if starts_at < now() then
    raise exception 'date_in_past';
  end if;

  -- Réutilise le client existant (même email chez ce coach) sinon le crée.
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
    'pending',
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
