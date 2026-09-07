-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Frais de transaction par plan, figés sur chaque paiement.
--
--   essential : 5 % tout compris        pro : 3 % tout compris
--   studio    : 0 % Madger, frais Stripe au coût réel (modèle seulement,
--               aucune colonne ne l'active encore)
--
-- « Tout compris » : les frais Stripe carte sont supportés par Madger. Ils
-- restent enregistrés (stripe_fee_cents) pour la comptabilité interne et la
-- marge par plan. Exception : paiement en 3 fois (Klarna, Alma) activé par le
-- coach, dont les frais lui sont déduits (provider_fee_cents).
--
-- Le taux est écrit à la CRÉATION de la ligne payments (empreinte bancaire
-- ou débit, moment de l'acceptation des CGV) et ne bouge plus jamais.
-- À exécuter dans Supabase → SQL Editor → Run (après 0063).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.payments
  add column if not exists plan               text,
  add column if not exists fee_rate_bps       int,
  add column if not exists payment_method     text,
  add column if not exists provider_fee_cents int not null default 0;

do $$ begin
  alter table public.payments
    add constraint payments_plan_chk
    check (plan is null or plan in ('essential','pro','studio'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.payments
    add constraint payments_fee_rate_chk
    check (fee_rate_bps is null or (fee_rate_bps >= 0 and fee_rate_bps <= 10000));
exception when duplicate_object then null; end $$;

comment on column public.payments.plan is
  'Plan du coach au moment du paiement (figé).';
comment on column public.payments.fee_rate_bps is
  'Taux de frais de transaction Madger figé au paiement, en points de base (500 = 5 %).';
comment on column public.payments.payment_method is
  'Type de moyen de paiement Stripe (card, klarna, alma, link, sepa_debit…).';
comment on column public.payments.provider_fee_cents is
  'Frais du paiement en 3 fois déduits du versement du coach (0 hors Klarna/Alma).';
comment on column public.payments.stripe_fee_cents is
  'Frais Stripe réels de la charge. Information interne Madger (marge), jamais déduits du coach hors paiement fractionné.';

-- Lignes existantes sans taux : figées d'après le plan courant du coach
-- (aucun coach actif : périmètre de test uniquement).
update public.payments p
   set plan = case when c.pro_until is not null and c.pro_until > now() then 'pro' else 'essential' end,
       fee_rate_bps = case when c.pro_until is not null and c.pro_until > now() then 300 else 500 end
  from public.coaches c
 where c.id = p.coach_id
   and p.fee_rate_bps is null;

create index if not exists payments_plan_paid_idx
  on public.payments(plan, paid_at);

-- ── Marge nette Madger par plan et par mois (admin, service role) ───────────
-- marge = frais Madger − frais Stripe réels + frais 3x refacturés au coach.
-- Mois de rattachement : versement au coach, sinon résolution, sinon paiement
-- (même règle que les factures Madger).
create or replace function public.admin_margin_by_plan_month(p_months int default 12)
returns table (
  month              date,
  plan               text,
  payments           bigint,
  gross_cents        bigint,
  madger_fee_cents   bigint,
  stripe_fee_cents   bigint,
  provider_fee_cents bigint,
  net_margin_cents   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('month', coalesce(released_at, resolved_at, paid_at))::date as month,
         coalesce(plan, 'essential') as plan,
         count(*)::bigint as payments,
         coalesce(sum(amount_cents - coalesce(refunded_cents, 0)), 0)::bigint as gross_cents,
         coalesce(sum(coalesce(commission_cents, 0)), 0)::bigint as madger_fee_cents,
         coalesce(sum(coalesce(stripe_fee_cents, 0)), 0)::bigint as stripe_fee_cents,
         coalesce(sum(coalesce(provider_fee_cents, 0)), 0)::bigint as provider_fee_cents,
         coalesce(sum(coalesce(commission_cents, 0) - coalesce(stripe_fee_cents, 0) + coalesce(provider_fee_cents, 0)), 0)::bigint as net_margin_cents
    from payments
   where status in ('paid', 'refunded')
     and paid_at is not null
     and coalesce(released_at, resolved_at, paid_at)
         >= date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1)
   group by 1, 2
   order by 1 desc, 2
$$;
revoke execute on function public.admin_margin_by_plan_month(int) from public;
revoke execute on function public.admin_margin_by_plan_month(int) from anon;
revoke execute on function public.admin_margin_by_plan_month(int) from authenticated;
grant execute on function public.admin_margin_by_plan_month(int) to service_role;
