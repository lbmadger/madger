-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Packs de séances décomptés (10 achetées → 7 restantes)
-- À exécuter dans Supabase → SQL Editor → Run (après 0022).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un achat de pack crée un solde de crédits (total = taille du pack, la
-- séance réservée à l'achat compte pour 1). Ensuite, chaque séance CONFIRMÉE
-- entre ce client et ce coach SANS paiement propre consomme 1 crédit
-- automatiquement (trigger). Une annulation re-crédite le pack.

create table if not exists public.pack_credits (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.coaches(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  total      int not null check (total > 0),
  used       int not null default 0 check (used >= 0),
  created_at timestamptz not null default now()
);
create index if not exists pack_credits_coach_client_idx
  on public.pack_credits(coach_id, client_id);

alter table public.pack_credits enable row level security;
drop policy if exists pack_credits_owner_all on public.pack_credits;
create policy pack_credits_owner_all on public.pack_credits
  for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- Trace sur la séance : quel crédit elle a consommé (pour re-créditer si
-- annulation).
alter table public.bookings
  add column if not exists pack_credit_id uuid references public.pack_credits(id) on delete set null;

-- ── Décompte automatique ────────────────────────────────────────────────────
create or replace function public.handle_pack_credit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_credit uuid;
begin
  -- Séance confirmée SANS paiement propre → consomme le plus ancien crédit
  -- disponible de ce client chez ce coach.
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.pack_credit_id is null
     and new.client_id is not null
     and not exists (select 1 from payments p where p.booking_id = new.id)
  then
    select id into v_credit
      from pack_credits
     where coach_id = new.coach_id
       and client_id = new.client_id
       and used < total
     order by created_at
     limit 1;
    if v_credit is not null then
      update pack_credits set used = used + 1 where id = v_credit;
      update bookings set pack_credit_id = v_credit where id = new.id;
    end if;

  -- Annulation d'une séance liée à un pack → re-crédite.
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

drop trigger if exists bookings_pack_credit on public.bookings;
create trigger bookings_pack_credit
  after insert or update of status on public.bookings
  for each row
  when (pg_trigger_depth() = 0)
  execute function public.handle_pack_credit();
