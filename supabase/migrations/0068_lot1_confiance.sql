-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Lot 1 « confiance » avant lancement.
--
-- 1. TVA hors franchise : coaches.vat_rate_bps (0 = franchise en base, 550,
--    1000, 2000). Les prix restent TTC (ce que paie le client) ; la facture
--    ventile HT / TVA / TTC quand un numéro de TVA ET un taux sont renseignés.
-- 2. SIRET vérifié : coaches.siret_verified_at + siret_legal_name, écrits par
--    le serveur (/api/siret/verify, API recherche-entreprises). Aucun droit
--    d'écriture pour le coach : seule la vérification serveur les pose.
-- 3. Rappels SMS J-1 (Twilio) : coaches.sms_reminders_enabled (réglage Pro),
--    bookings.reminder_sms_sent_at (idempotence du cron).
-- 4. Liste d'attente sur créneau : slot_waitlist, écrite et lue uniquement
--    côté serveur (service role) ; RLS sans policy.
-- À exécuter dans Supabase → SQL Editor → Run (après 0067).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. TVA ─────────────────────────────────────────────────────────────────
alter table public.coaches
  add column if not exists vat_rate_bps int not null default 0;
alter table public.coaches
  drop constraint if exists coaches_vat_rate_bps_check;
alter table public.coaches
  add constraint coaches_vat_rate_bps_check
  check (vat_rate_bps in (0, 550, 1000, 2000));
grant update (vat_rate_bps) on public.coaches to authenticated;

-- ── 2. SIRET vérifié ───────────────────────────────────────────────────────
alter table public.coaches
  add column if not exists siret_verified_at timestamptz,
  add column if not exists siret_legal_name  text;
-- Un SIRET modifié par le coach invalide la vérification précédente.
create or replace function public.coaches_reset_siret_verification()
returns trigger language plpgsql as $$
begin
  if new.siret is distinct from old.siret then
    new.siret_verified_at := null;
    new.siret_legal_name := null;
  end if;
  return new;
end $$;
drop trigger if exists coaches_reset_siret_verification on public.coaches;
create trigger coaches_reset_siret_verification
  before update of siret on public.coaches
  for each row execute function public.coaches_reset_siret_verification();

-- ── 3. Rappels SMS ─────────────────────────────────────────────────────────
alter table public.coaches
  add column if not exists sms_reminders_enabled boolean not null default false;
grant update (sms_reminders_enabled) on public.coaches to authenticated;
alter table public.bookings
  add column if not exists reminder_sms_sent_at timestamptz;

-- ── 4. Liste d'attente sur créneau ─────────────────────────────────────────
create table if not exists public.slot_waitlist (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coaches(id) on delete cascade,
  starts_at   timestamptz not null,
  email       text not null,
  first_name  text,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  constraint slot_waitlist_email_len check (length(email) between 5 and 200),
  constraint slot_waitlist_name_len check (first_name is null or length(first_name) <= 60)
);
create unique index if not exists slot_waitlist_unique
  on public.slot_waitlist (coach_id, starts_at, lower(email));
create index if not exists slot_waitlist_coach_start_idx
  on public.slot_waitlist (coach_id, starts_at)
  where notified_at is null;
alter table public.slot_waitlist enable row level security;
revoke all on public.slot_waitlist from anon, authenticated;
