-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Protection des packs (décisions du 8 septembre 2026).
--
-- 1. Le client peut demander le remboursement des séances non consommées ;
--    le coach a 7 jours pour accepter ou refuser avec motif, sans réponse le
--    remboursement part automatiquement (cron). Refus contesté : le client
--    saisit Madger.
-- 2. Un pack qui expire alors que le coach est en cause (aucun créneau libre
--    à venir, ou plusieurs séances du pack annulées par le coach) est
--    prolongé automatiquement de 30 jours (cron), au plus deux fois.
-- 3. Coach parti (profil dépublié ou Stripe coupé depuis 14 jours) : le reste
--    de ses packs actifs est remboursé (cron). coaches.offline_since est
--    posé par trigger.
-- 4. Limite de séances par semaine sur un pack (services.max_per_week,
--    figée sur pack_credits à l'achat) : le client ne peut pas tout placer
--    la même semaine.
-- À exécuter dans Supabase → SQL Editor → Run (après 0068).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 4. Limite hebdomadaire ──────────────────────────────────────────────────
alter table public.services
  add column if not exists max_per_week smallint;
alter table public.services drop constraint if exists services_max_per_week_chk;
alter table public.services
  add constraint services_max_per_week_chk
  check (max_per_week is null or max_per_week between 1 and 7);
grant insert (max_per_week), update (max_per_week) on public.services to authenticated;

-- ── 1. et 2. Colonnes sur les packs vendus ──────────────────────────────────
alter table public.pack_credits
  add column if not exists max_per_week smallint,
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refund_request_note text,
  add column if not exists refund_request_status text,
  add column if not exists refund_refused_reason text,
  add column if not exists refund_responded_at timestamptz,
  add column if not exists extended_count smallint not null default 0,
  add column if not exists extended_at timestamptz;
alter table public.pack_credits drop constraint if exists pack_credits_refund_request_chk;
alter table public.pack_credits
  add constraint pack_credits_refund_request_chk
  check (refund_request_status is null
         or refund_request_status in ('pending', 'accepted', 'refused', 'auto'));
create index if not exists pack_credits_refund_pending_idx
  on public.pack_credits (refund_requested_at)
  where refund_request_status = 'pending';

-- Journal : nouveaux motifs.
alter table public.credit_events drop constraint if exists credit_events_reason_check;
alter table public.credit_events
  add constraint credit_events_reason_check check (reason in (
    'purchase', 'booking', 'cancel_restore', 'late_cancel_lost',
    'expired', 'coach_gift', 'coach_adjust', 'refund_closed',
    'coach_closed', 'extended', 'refund_requested', 'refund_refused'));

-- Ouverture d'un pack : la limite hebdomadaire est figée à l'achat.
create or replace function public.pack_credit_open(
  p_coach uuid, p_client uuid, p_service uuid, p_payment uuid, p_booking uuid
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s record;
  v_id uuid;
begin
  select name, price_cents, pack_size, validity_days, cancel_hours, max_per_week into s
    from services where id = p_service and coach_id = p_coach;
  if s is null or coalesce(s.pack_size, 0) < 2 then return null; end if;

  insert into pack_credits
    (coach_id, client_id, service_id, payment_id, total, paid_total, used, status,
     expires_at, service_name, price_cents, cancel_hours, max_per_week)
  values
    (p_coach, p_client, p_service, p_payment, s.pack_size, s.pack_size, 0, 'active',
     case when s.validity_days is null then null
          else now() + make_interval(days => s.validity_days) end,
     s.name, s.price_cents, coalesce(s.cancel_hours, 24), s.max_per_week)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from pack_credits where payment_id = p_payment;
    return v_id;
  end if;

  perform pack_credit_log(v_id, null, s.pack_size, 'purchase', 'client', null);
  if p_booking is not null then
    update pack_credits set used = 1, updated_at = now() where id = v_id;
    update bookings set pack_credit_id = v_id where id = p_booking;
    perform pack_credit_log(v_id, p_booking, -1, 'booking', 'client', null);
  end if;
  return v_id;
end;
$$;

-- Prolongation d'un pack (cron) : validité repoussée, compteur incrémenté,
-- journalisé. Service role uniquement.
create or replace function public.pack_credit_extend(p_pack uuid, p_days int, p_note text)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_new timestamptz;
begin
  update pack_credits
     set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => p_days),
         extended_count = extended_count + 1,
         extended_at = now(),
         updated_at = now()
   where id = p_pack and status = 'active'
  returning expires_at into v_new;
  if v_new is null then return null; end if;
  perform pack_credit_log(p_pack, null, 0, 'extended', 'system', p_note);
  return v_new;
end;
$$;
revoke all on function public.pack_credit_extend(uuid, int, text) from public, anon, authenticated;

-- ── 3. Coach hors ligne : profil dépublié ou paiements coupés ───────────────
alter table public.coaches
  add column if not exists offline_since timestamptz;

create or replace function public.coaches_track_offline()
returns trigger language plpgsql as $$
begin
  if new.listed = true and new.stripe_charges_enabled = true then
    new.offline_since := null;
  elsif new.offline_since is null then
    new.offline_since := now();
  end if;
  return new;
end $$;

drop trigger if exists coaches_track_offline on public.coaches;
create trigger coaches_track_offline
  before update of listed, stripe_charges_enabled on public.coaches
  for each row execute function public.coaches_track_offline();

-- Rétro-remplissage : seuls les coachs qui ont des packs actifs comptent.
update public.coaches c
   set offline_since = now()
 where c.offline_since is null
   and (c.listed = false or c.stripe_charges_enabled = false)
   and exists (select 1 from public.pack_credits p
                where p.coach_id = c.id and p.status = 'active');
