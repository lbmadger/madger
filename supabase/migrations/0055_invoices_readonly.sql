-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement RLS : factures en lecture seule pour le coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0054).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Faille (audit) : `invoices` était restée en `for all` (0001) — un coach
-- pouvait INSERT/UPDATE/DELETE ses propres lignes de facture, y compris le
-- numéro séquentiel, le montant et la date d'émission. Pour un document
-- comptable légalement numéroté, c'est un trou d'intégrité (0035 avait fermé
-- le même risque sur `payments`, mais pas sur `invoices`).
--
-- Aujourd'hui aucune écriture applicative ne passe par le client coach : les
-- « factures » du dashboard sont dérivées de `payments`, et la future
-- facturation électronique écrira via le service role (qui contourne la RLS).
-- On aligne donc `invoices` sur `payments` : lecture seule pour le coach.

drop policy if exists invoices_owner_all on public.invoices;
drop policy if exists invoices_read_own on public.invoices;
create policy invoices_read_own on public.invoices
  for select using (auth.uid() = coach_id);
