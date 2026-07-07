-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement RLS (audit sécurité) + index commissions
-- À exécuter dans Supabase → SQL Editor → Run (après 0034).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Trois failles fermées :
--  1. coaches : l'UPDATE était ouvert sur TOUTES les colonnes → un coach
--     pouvait s'écrire pro_until=2099 (0 % de commission à vie) ou pointer
--     stripe_account_id ailleurs. Désormais l'UPDATE authenticated est limité
--     aux colonnes de profil ; les colonnes Stripe/abonnement ne s'écrivent
--     que via le service role.
--  2. payments : écriture cliente interdite (lecture seule pour le coach) ;
--     tous les mouvements passent déjà par le service role.
--  3. bookings : DELETE limité aux créneaux bloqués sans paiement rattaché
--     (fini la suppression d'une séance payée pour étouffer un litige) ;
--     INSERT/UPDATE vérifient que le client référencé appartient au coach.

-- ── 1. COACHES : colonnes sensibles hors de portée du client ────────────────
revoke update on public.coaches from authenticated;
grant update (
  first_name, last_name, slug, specialty, bio, avatar_url, phone,
  locale, timezone, city, accepts_online, lat, lng, listed,
  cancellation_policy, booking_mode, min_notice_hours,
  sport, specialties, venues, gym_name,
  business_name, siret, vat_number, billing_address,
  google_refresh_token, google_connected_at,
  onboarding_completed
) on public.coaches to authenticated;

-- ── 2. PAYMENTS : lecture seule pour le coach ────────────────────────────────
drop policy if exists payments_owner_all on public.payments;
drop policy if exists payments_read_own on public.payments;
create policy payments_read_own on public.payments
  for select using (auth.uid() = coach_id);

-- ── 3. BOOKINGS : policies éclatées ─────────────────────────────────────────
drop policy if exists bookings_owner_all on public.bookings;
drop policy if exists bookings_select_own on public.bookings;
drop policy if exists bookings_insert_own on public.bookings;
drop policy if exists bookings_update_own on public.bookings;
drop policy if exists bookings_delete_blocks on public.bookings;

create policy bookings_select_own on public.bookings
  for select using (auth.uid() = coach_id);

-- Insert : le coach chez lui, et un client qui lui appartient (ou aucun).
create policy bookings_insert_own on public.bookings
  for insert with check (
    auth.uid() = coach_id
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = client_id and c.coach_id = auth.uid()
      )
    )
  );

create policy bookings_update_own on public.bookings
  for update using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = client_id and c.coach_id = auth.uid()
      )
    )
  );

-- Delete : uniquement un créneau bloqué, jamais une séance avec paiement.
create policy bookings_delete_blocks on public.bookings
  for delete using (
    auth.uid() = coach_id
    and is_block = true
    and not exists (
      select 1 from public.payments p where p.booking_id = bookings.id
    )
  );

-- ── 4. Index commissions (pages factures / abonnement / facture Madger) ─────
create index if not exists payments_coach_commission_idx
  on public.payments(coach_id, released_at desc)
  where commission_cents > 0;
