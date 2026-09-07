-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Lot 0 : fondations de la couche business (packs, crédits, journal,
-- factures séquentielles, avoirs, CGV horodatées).
-- À exécuter dans Supabase → SQL Editor → Run (après 0055).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Ce que cette migration pose, sans toucher au parcours unitaire :
--  1. services : validité (jours) et délai d'annulation d'un pack, 3 packs
--     actifs maximum par coach (trigger).
--  2. pack_credits : statut (active / expired / refunded / closed), date
--     d'expiration, instantané de l'offre au moment de l'achat, crédit jamais
--     négatif (contrainte), RLS en LECTURE SEULE pour le coach (toute écriture
--     passe par les fonctions ci-dessous ou le service role).
--  3. credit_events : journal de chaque mouvement de crédit (achat, séance,
--     restitution, perte, expiration, geste commercial, clôture).
--  4. Fonctions atomiques : ouverture d'un pack, consommation (pack qui expire
--     le plus tôt d'abord), restitution, geste commercial du coach,
--     expiration quotidienne, clôture.
--  5. Factures : compteur séquentiel SANS TROU par coach et par an, table
--     invoices enfin écrite (ensure_invoice) et avoirs (create_credit_note).
--     Les paiements antérieurs gardent leur ancien numéro (jamais renumérotés).
--  6. payments.terms_accepted_at / terms_version : acceptation des CGV.
--  7. bookings.credit_lost : séance annulée tard dont le crédit est perdu.

-- ── 1. SERVICES ─────────────────────────────────────────────────────────────
alter table public.services
  add column if not exists validity_days int
    check (validity_days is null or validity_days > 0),
  add column if not exists cancel_hours smallint not null default 24
    check (cancel_hours in (12, 24, 48));

-- 3 packs actifs maximum par coach.
create or replace function public.enforce_pack_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.type = 'pack' and new.active then
    if (select count(*) from services
         where coach_id = new.coach_id and type = 'pack' and active
           and id <> new.id) >= 3 then
      raise exception 'pack_limit';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists services_pack_limit on public.services;
create trigger services_pack_limit
  before insert or update of type, active on public.services
  for each row execute function public.enforce_pack_limit();

-- La vue publique expose la validité et le délai (affichés sur la fiche).
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
    s.cancel_hours
  from public.services s
  join public.coaches c on c.id = s.coach_id
  where s.active = true and c.listed = true;
grant select on public.public_services to anon, authenticated;

-- ── 2. PACK_CREDITS ─────────────────────────────────────────────────────────
alter table public.pack_credits
  add column if not exists status text not null default 'active'
    check (status in ('active', 'expired', 'refunded', 'closed')),
  add column if not exists expires_at timestamptz,
  add column if not exists service_name text,
  add column if not exists price_cents int,
  add column if not exists cancel_hours smallint not null default 24,
  add column if not exists updated_at timestamptz not null default now();

-- Crédit jamais négatif : used borné par total.
update public.pack_credits set used = total where used > total;
alter table public.pack_credits drop constraint if exists pack_credits_used_le_total;
alter table public.pack_credits
  add constraint pack_credits_used_le_total check (used >= 0 and used <= total);

-- Packs déjà clôturés par un remboursement (ancien mécanisme used = total).
update public.pack_credits pc
   set status = 'refunded'
  from public.payments p
 where p.id = pc.payment_id and p.status = 'refunded' and pc.status = 'active';

create index if not exists pack_credits_active_idx
  on public.pack_credits (client_id, coach_id, expires_at)
  where status = 'active';

-- RLS : le coach LIT ses packs ; aucune écriture directe depuis le client.
drop policy if exists pack_credits_owner_all on public.pack_credits;
drop policy if exists pack_credits_read_own on public.pack_credits;
create policy pack_credits_read_own on public.pack_credits
  for select using (auth.uid() = coach_id);
revoke insert, update, delete on public.pack_credits from anon, authenticated;

-- ── 7. BOOKINGS : crédit perdu (annulation tardive) ─────────────────────────
alter table public.bookings
  add column if not exists credit_lost boolean not null default false;

-- ── 3. CREDIT_EVENTS : journal des crédits ──────────────────────────────────
create table if not exists public.credit_events (
  id             uuid primary key default gen_random_uuid(),
  pack_credit_id uuid not null references public.pack_credits(id) on delete cascade,
  coach_id       uuid not null references public.coaches(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  booking_id     uuid references public.bookings(id) on delete set null,
  delta          int not null,
  balance_after  int not null,
  reason         text not null check (reason in (
                   'purchase', 'booking', 'cancel_restore', 'late_cancel_lost',
                   'expired', 'coach_gift', 'coach_adjust', 'refund_closed',
                   'coach_closed')),
  actor          text not null check (actor in ('coach', 'client', 'system')),
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists credit_events_pack_idx
  on public.credit_events (pack_credit_id, created_at);
create index if not exists credit_events_coach_idx
  on public.credit_events (coach_id, created_at desc);

alter table public.credit_events enable row level security;
drop policy if exists credit_events_read_own on public.credit_events;
create policy credit_events_read_own on public.credit_events
  for select using (auth.uid() = coach_id);
revoke insert, update, delete on public.credit_events from anon, authenticated;

-- ── 4. FONCTIONS CRÉDITS ────────────────────────────────────────────────────
-- Journalise un mouvement (solde relu sur la ligne, 0 si le pack est inactif).
create or replace function public.pack_credit_log(
  p_pack uuid, p_booking uuid, p_delta int, p_reason text, p_actor text, p_note text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  select coach_id, client_id, total, used, status into r
    from pack_credits where id = p_pack;
  if r is null then return; end if;
  insert into credit_events
    (pack_credit_id, coach_id, client_id, booking_id, delta, balance_after,
     reason, actor, note)
  values
    (p_pack, r.coach_id, r.client_id, p_booking, p_delta,
     case when r.status = 'active' then r.total - r.used else 0 end,
     p_reason, p_actor, p_note);
end;
$$;

-- Ouverture d'un pack à l'achat : instantané de l'offre, expiration calculée,
-- la séance réservée dans le même geste consomme le premier crédit.
create or replace function public.pack_credit_open(
  p_coach uuid, p_client uuid, p_service uuid, p_payment uuid, p_booking uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s record;
  v_id uuid;
begin
  select name, price_cents, pack_size, validity_days, cancel_hours into s
    from services where id = p_service and coach_id = p_coach;
  if s is null or coalesce(s.pack_size, 0) < 2 then return null; end if;

  insert into pack_credits
    (coach_id, client_id, service_id, payment_id, total, used, status,
     expires_at, service_name, price_cents, cancel_hours)
  values
    (p_coach, p_client, p_service, p_payment, s.pack_size, 0, 'active',
     case when s.validity_days is null then null
          else now() + make_interval(days => s.validity_days) end,
     s.name, s.price_cents, coalesce(s.cancel_hours, 24))
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from pack_credits where payment_id = p_payment;
    return v_id;
  end if;

  perform pack_credit_log(v_id, null, s.pack_size, 'purchase', 'client', null);
  if p_booking is not null then
    update pack_credits set used = 1 where id = v_id;
    update bookings set pack_credit_id = v_id where id = p_booking;
    perform pack_credit_log(v_id, p_booking, -1, 'booking', 'client', null);
  end if;
  return v_id;
end;
$$;

-- Consommation atomique : le pack ACTIF, non expiré, qui expire le plus tôt.
-- Retourne l'id du pack débité, null si aucun crédit disponible.
create or replace function public.pack_credit_consume(
  p_coach uuid, p_client uuid, p_booking uuid, p_actor text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_credit uuid;
begin
  update pack_credits
     set used = used + 1, updated_at = now()
   where id = (
     select id from pack_credits
      where coach_id = p_coach
        and client_id = p_client
        and status = 'active'
        and used < total
        and (expires_at is null or expires_at > now())
      order by expires_at asc nulls last, created_at asc
      limit 1
      for update skip locked
   )
     and used < total
  returning id into v_credit;
  if v_credit is null then return null; end if;

  update bookings set pack_credit_id = v_credit where id = p_booking;
  perform pack_credit_log(v_credit, p_booking, -1, 'booking',
                          coalesce(p_actor, 'system'), null);
  return v_credit;
end;
$$;

-- Restitution à l'annulation. p_lost = true : annulation tardive, le crédit
-- est perdu (journalisé, la séance garde son crédit pour le versement).
create or replace function public.pack_credit_restore(
  p_booking uuid, p_actor text, p_lost boolean, p_note text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pack uuid;
  v_status text;
begin
  select pack_credit_id into v_pack from bookings where id = p_booking;
  if v_pack is null then return; end if;

  if p_lost then
    update bookings set credit_lost = true where id = p_booking;
    perform pack_credit_log(v_pack, p_booking, 0, 'late_cancel_lost',
                            coalesce(p_actor, 'system'), p_note);
    return;
  end if;

  select status into v_status from pack_credits where id = v_pack for update;
  if v_status = 'active' then
    update pack_credits
       set used = greatest(0, used - 1), updated_at = now()
     where id = v_pack;
    update bookings set pack_credit_id = null where id = p_booking;
    perform pack_credit_log(v_pack, p_booking, 1, 'cancel_restore',
                            coalesce(p_actor, 'system'), p_note);
  else
    -- Pack expiré ou clôturé : rien à rendre, on trace.
    update bookings set pack_credit_id = null where id = p_booking;
    perform pack_credit_log(v_pack, p_booking, 0, 'cancel_restore',
                            coalesce(p_actor, 'system'),
                            coalesce(p_note, 'pack inactif, crédit non restitué'));
  end if;
end;
$$;

-- Geste commercial du coach (depuis son dashboard) : +N crédits offerts ou
-- -N retirés, jamais en dessous de zéro. Retourne le solde.
create or replace function public.coach_adjust_pack_credit(
  p_pack uuid, p_delta int, p_note text
) returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_rem int;
begin
  select coach_id, total, used, status into r
    from pack_credits where id = p_pack for update;
  if r is null or r.coach_id is distinct from auth.uid() then
    raise exception 'not_found';
  end if;
  if r.status <> 'active' then raise exception 'pack_inactive'; end if;
  if p_delta = 0 then return r.total - r.used; end if;
  if p_delta > 0 then
    update pack_credits
       set total = total + p_delta, updated_at = now() where id = p_pack;
    perform pack_credit_log(p_pack, null, p_delta, 'coach_gift', 'coach', p_note);
  else
    if r.used - p_delta > r.total then raise exception 'credit_negative'; end if;
    update pack_credits
       set used = used - p_delta, updated_at = now() where id = p_pack;
    perform pack_credit_log(p_pack, null, p_delta, 'coach_adjust', 'coach', p_note);
  end if;
  select total - used into v_rem from pack_credits where id = p_pack;
  return v_rem;
end;
$$;
grant execute on function public.coach_adjust_pack_credit(uuid, int, text) to authenticated;

-- Clôture (remboursement, refus du pack) : les crédits restants sont perdus.
create or replace function public.close_pack_credit(
  p_pack uuid, p_status text, p_actor text, p_note text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  select total, used, status into r from pack_credits where id = p_pack for update;
  if r is null or r.status <> 'active' then return; end if;
  update pack_credits
     set status = case when p_status in ('refunded', 'closed') then p_status
                       else 'closed' end,
         updated_at = now()
   where id = p_pack;
  perform pack_credit_log(p_pack, null, -(r.total - r.used),
                          case when p_status = 'refunded' then 'refund_closed'
                               else 'coach_closed' end,
                          coalesce(p_actor, 'system'), p_note);
end;
$$;

-- Expiration quotidienne (appelée par le cron de versement) : journalisée.
create or replace function public.expire_pack_credits()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id, total, used from pack_credits
     where status = 'active' and expires_at is not null and expires_at < now()
     for update skip locked
  loop
    update pack_credits set status = 'expired', updated_at = now() where id = r.id;
    perform pack_credit_log(r.id, null, -(r.total - r.used), 'expired',
                            'system', null);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Trigger existant, réécrit sur les fonctions ci-dessus : un crédit n'est
-- consommé que lorsque LE COACH confirme ou crée la séance ; l'annulation
-- restitue (sauf crédit déjà déclaré perdu).
create or replace function public.handle_pack_credit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.pack_credit_id is null
     and new.client_id is not null
     and auth.uid() = new.coach_id
     and not exists (select 1 from payments p where p.booking_id = new.id)
  then
    perform pack_credit_consume(new.coach_id, new.client_id, new.id, 'coach');

  elsif tg_op = 'UPDATE'
     and new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and new.pack_credit_id is not null
     and not new.credit_lost
  then
    perform pack_credit_restore(
      new.id,
      case when auth.uid() = new.coach_id then 'coach' else 'system' end,
      false, null);
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_pack_credit on public.bookings;
create trigger bookings_pack_credit
  after insert or update of status on public.bookings
  for each row
  when (pg_trigger_depth() = 0)
  execute function public.handle_pack_credit();

-- ── 5. FACTURES : numérotation séquentielle sans trou + avoirs ──────────────
create table if not exists public.invoice_counters (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  year     int  not null,
  kind     text not null check (kind in ('invoice', 'credit_note')),
  last     int  not null default 0,
  primary key (coach_id, year, kind)
);
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

alter table public.invoices
  add column if not exists kind text not null default 'invoice'
    check (kind in ('invoice', 'credit_note')),
  add column if not exists credits_invoice_id uuid
    references public.invoices(id) on delete set null,
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists service_name text,
  add column if not exists booking_starts_at timestamptz,
  add column if not exists pack_credit_id uuid
    references public.pack_credits(id) on delete set null,
  add column if not exists reason text;

create unique index if not exists invoices_coach_number_uniq
  on public.invoices (coach_id, number) where number is not null;
create unique index if not exists invoices_payment_invoice_uniq
  on public.invoices (payment_id) where kind = 'invoice' and payment_id is not null;
create index if not exists invoices_payment_idx on public.invoices (payment_id);

-- Le coach lit ses factures ; aucune écriture directe.
drop policy if exists invoices_owner_all on public.invoices;
drop policy if exists invoices_read_own on public.invoices;
create policy invoices_read_own on public.invoices
  for select using (auth.uid() = coach_id);
revoke insert, update, delete on public.invoices from anon, authenticated;

-- Numéro suivant : F-AAAA-0001 (factures) ou AV-AAAA-0001 (avoirs), par coach,
-- par année civile (heure de Paris). Le compteur est incrémenté dans la même
-- transaction que l'insertion : jamais de trou.
create or replace function public.next_invoice_number(
  p_coach uuid, p_kind text, p_at timestamptz
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_year int := extract(year from (coalesce(p_at, now()) at time zone 'Europe/Paris'))::int;
  v_n int;
begin
  insert into invoice_counters (coach_id, year, kind, last)
  values (p_coach, v_year, p_kind, 1)
  on conflict (coach_id, year, kind)
  do update set last = invoice_counters.last + 1
  returning last into v_n;
  return (case when p_kind = 'credit_note' then 'AV' else 'F' end)
         || '-' || v_year || '-' || lpad(v_n::text, 4, '0');
end;
$$;

-- Facture d'un paiement encaissé : créée une seule fois (verrou consultatif
-- par paiement), avec l'instantané client / prestation / séance.
create or replace function public.ensure_invoice(p_payment uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  p record;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('invoice_' || p_payment::text));
  select id into v_id from invoices
   where payment_id = p_payment and kind = 'invoice';
  if v_id is not null then return v_id; end if;

  select pay.id, pay.coach_id, pay.client_id, pay.paid_at, pay.amount_cents,
         pay.currency,
         cl.first_name, cl.last_name, cl.email,
         s.name as service_name,
         b.starts_at,
         pc.id as pack_id
    into p
    from payments pay
    left join clients  cl on cl.id = pay.client_id
    left join services s  on s.id  = pay.service_id
    left join bookings b  on b.id  = pay.booking_id
    left join pack_credits pc on pc.payment_id = pay.id
   where pay.id = p_payment;
  if p is null or p.paid_at is null then return null; end if;

  insert into invoices
    (coach_id, client_id, payment_id, number, issued_at, amount_cents,
     currency, status, kind, client_name, client_email, service_name,
     booking_starts_at, pack_credit_id)
  values
    (p.coach_id, p.client_id, p.id,
     next_invoice_number(p.coach_id, 'invoice', p.paid_at),
     p.paid_at, p.amount_cents, coalesce(p.currency, 'eur'), 'issued',
     'invoice',
     nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
     p.email, p.service_name, p.starts_at, p.pack_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- Avoir : reçoit le TOTAL remboursé à ce jour sur le paiement et n'émet que
-- la différence avec les avoirs déjà émis. Idempotent : la route qui rembourse
-- et le webhook Stripe peuvent l'appeler tous les deux.
create or replace function public.create_credit_note(
  p_payment uuid, p_total_refunded_cents int, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  inv record;
  v_done int;
  v_delta int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('invoice_' || p_payment::text));
  select id, coach_id, client_id, currency, client_name, client_email,
         service_name, booking_starts_at, pack_credit_id
    into inv
    from invoices where payment_id = p_payment and kind = 'invoice';
  -- Paiement antérieur à la numérotation séquentielle : pas d'avoir rattaché.
  if inv is null then return null; end if;

  select coalesce(sum(amount_cents), 0) into v_done
    from invoices where payment_id = p_payment and kind = 'credit_note';
  v_delta := coalesce(p_total_refunded_cents, 0) - v_done;
  if v_delta <= 0 then return null; end if;

  insert into invoices
    (coach_id, client_id, payment_id, number, issued_at, amount_cents,
     currency, status, kind, credits_invoice_id, client_name, client_email,
     service_name, booking_starts_at, pack_credit_id, reason)
  values
    (inv.coach_id, inv.client_id, p_payment,
     next_invoice_number(inv.coach_id, 'credit_note', now()),
     now(), v_delta, inv.currency, 'issued', 'credit_note', inv.id,
     inv.client_name, inv.client_email, inv.service_name,
     inv.booking_starts_at, inv.pack_credit_id, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

-- Ces fonctions ne s'appellent que côté serveur (service role) ou depuis les
-- autres fonctions / le trigger (qui s'exécutent en tant que propriétaire).
do $$
declare f text;
begin
  foreach f in array array[
    'public.pack_credit_log(uuid, uuid, int, text, text, text)',
    'public.pack_credit_open(uuid, uuid, uuid, uuid, uuid)',
    'public.pack_credit_consume(uuid, uuid, uuid, text)',
    'public.pack_credit_restore(uuid, text, boolean, text)',
    'public.close_pack_credit(uuid, text, text, text)',
    'public.expire_pack_credits()',
    'public.next_invoice_number(uuid, text, timestamptz)',
    'public.ensure_invoice(uuid)',
    'public.create_credit_note(uuid, int, text)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon, authenticated;', f);
    execute format('grant execute on function %s to service_role;', f);
  end loop;
end $$;

-- ── 6. PAYMENTS : acceptation des CGV ───────────────────────────────────────
alter table public.payments
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;
