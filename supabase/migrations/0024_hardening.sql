-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement production (audit) : unicité paiements, anti double
-- réservation, index de charge, packs sécurisés, vue avis filtrée.
-- À exécuter dans Supabase → SQL Editor → Run (après 0023).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Unicité des paiements Stripe ─────────────────────────────────────────
-- Empêche tout doublon si le retour de paiement est appelé deux fois en même
-- temps (double onglet, refresh, webhook + redirect).
create unique index if not exists payments_pi_uniq
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Un achat de pack = une seule ligne de crédits.
create unique index if not exists pack_credits_payment_uniq
  on public.pack_credits (payment_id)
  where payment_id is not null;

-- ── 2. Index de montée en charge ────────────────────────────────────────────
create index if not exists payments_booking_id_idx  on public.payments(booking_id);
create index if not exists bookings_client_id_idx   on public.bookings(client_id);
create index if not exists bookings_coach_starts_idx on public.bookings(coach_id, starts_at);
create index if not exists bookings_coach_pending_idx
  on public.bookings(coach_id, ends_at) where status = 'pending';
create index if not exists payments_coach_paid_idx
  on public.payments(coach_id, paid_at desc) where paid_at is not null;
create index if not exists pack_credits_client_idx  on public.pack_credits(client_id);

-- Recherches par email (espace client) et par ville (marketplace) en ILIKE.
create extension if not exists pg_trgm;
create index if not exists clients_email_trgm_idx
  on public.clients using gin (email gin_trgm_ops);
create index if not exists coaches_city_trgm_idx
  on public.coaches using gin (city gin_trgm_ops);

-- ── 3. Anti double réservation dans request_booking ─────────────────────────
-- Refuse une demande dont le créneau chevauche une séance en attente ou
-- confirmée du même coach (l'affichage des créneaux ne suffit pas : deux
-- clients peuvent demander le même créneau en même temps).
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

  -- Créneau déjà pris (pending/confirmed qui chevauche) → refus explicite.
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
    case when online then 'online' else 'in_person' end,
    nullif(trim(coalesce(message, '')), '')
  )
  returning id into v_booking;

  return v_booking;
end;
$$;

-- ── 4. Packs : décompte atomique et réservé aux actions du coach ────────────
-- Avant : une demande publique (non authentifiée) au nom d'un client pouvait
-- consommer ses crédits. Désormais un crédit n'est consommé que lorsque LE
-- COACH confirme ou crée la séance (auth.uid() = coach), et le décompte est
-- atomique (used < total vérifié dans l'UPDATE, pas avant).
create or replace function public.handle_pack_credit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_credit uuid;
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.pack_credit_id is null
     and new.client_id is not null
     and auth.uid() = new.coach_id
     and not exists (select 1 from payments p where p.booking_id = new.id)
  then
    update pack_credits
       set used = used + 1
     where id = (
       select id from pack_credits
        where coach_id = new.coach_id
          and client_id = new.client_id
          and used < total
        order by created_at
        limit 1
        for update skip locked
     )
       and used < total
    returning id into v_credit;
    if v_credit is not null then
      update bookings set pack_credit_id = v_credit where id = new.id;
    end if;

  elsif tg_op = 'UPDATE'
     and new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and new.pack_credit_id is not null
  then
    update pack_credits set used = greatest(0, used - 1)
     where id = new.pack_credit_id;
    update bookings set pack_credit_id = null where id = new.id;
  end if;

  return new;
end;
$$;

-- ── 5. Vue des avis publics : seulement les coachs listés ───────────────────
create or replace view public.public_reviews as
  select r.id, r.coach_id, r.rating, r.comment, r.created_at,
         c.first_name as client_first_name
    from public.reviews r
    join public.clients c on c.id = r.client_id
    join public.coaches co on co.id = r.coach_id
   where co.listed = true;
grant select on public.public_reviews to anon, authenticated;
