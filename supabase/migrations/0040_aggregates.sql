-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Agrégats SQL : les graphiques du dashboard et le total des
-- commissions admin sont calculés en base. Sans ça, les pages rapatrient
-- les lignes brutes et PostgREST plafonne à 1000 lignes : chiffres
-- silencieusement faux dès qu'un coach dépasse ce volume.
-- À exécuter dans Supabase → SQL Editor → Run (après 0039).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Revenus encaissés par mois du coach connecté (graphique 24 mois) ─────
-- security invoker : la policy payments_read_own s'applique (chaque coach ne
-- voit que ses lignes), auth.uid() borne en plus par sécurité.
create or replace function public.coach_monthly_revenue(p_months int default 24)
returns table (month date, total_cents bigint)
language sql
stable
set search_path = public
as $$
  select date_trunc('month', paid_at)::date as month,
         coalesce(sum(amount_cents), 0)::bigint as total_cents
    from payments
   where coach_id = auth.uid()
     and status = 'paid'
     and paid_at is not null
     and paid_at >= date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1)
   group by 1
   order by 1
$$;
grant execute on function public.coach_monthly_revenue(int) to authenticated;

-- ── 2. Séances par semaine du coach connecté (graphique 52 semaines) ────────
create or replace function public.coach_weekly_sessions(p_weeks int default 52)
returns table (week date, sessions bigint)
language sql
stable
set search_path = public
as $$
  select date_trunc('week', starts_at)::date as week,
         count(*)::bigint as sessions
    from bookings
   where coach_id = auth.uid()
     and is_block = false
     and status <> 'cancelled'
     and starts_at >= date_trunc('week', now()) - make_interval(weeks => greatest(p_weeks, 1) - 1)
     and starts_at < date_trunc('week', now()) + interval '1 week'
   group by 1
   order by 1
$$;
grant execute on function public.coach_weekly_sessions(int) to authenticated;

-- ── 3. Total des commissions Madger (page admin, service role uniquement) ───
create or replace function public.admin_total_commission()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(commission_cents), 0)::bigint from payments
$$;
revoke execute on function public.admin_total_commission() from public;
revoke execute on function public.admin_total_commission() from anon;
revoke execute on function public.admin_total_commission() from authenticated;
grant execute on function public.admin_total_commission() to service_role;
