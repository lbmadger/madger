-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Abonnement Pro (le coach paie Madger : 49 €/mois ou 490 €/an)
-- À exécuter dans Supabase → SQL Editor → Run (après 0014).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Distinct de Stripe Connect (stripe_account_id = le coach ENCAISSE ses clients).
-- Ici le coach est CLIENT de Madger sur le compte plateforme : on stocke son
-- customer/subscription Stripe et l'état de l'abonnement. `pro_until` (0010)
-- reste la source de vérité "est-ce que ce coach est Pro" — l'abonnement le
-- prolonge jusqu'à la fin de la période payée.

alter table public.coaches
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,   -- active | canceled | past_due | ...
  add column if not exists subscription_plan text;      -- monthly | annual

-- Prolonge pro_until du coach jusqu'à la fin de la période payée (idempotent :
-- on prend le max avec l'existant pour ne jamais raccourcir un Pro déjà acquis,
-- ex. via code promo). Appelée par les routes Stripe (service role).
create or replace function public.apply_pro_subscription(
  p_coach_id       uuid,
  p_customer_id    text,
  p_subscription_id text,
  p_status         text,
  p_plan           text,
  p_period_end     timestamptz
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update coaches set
    stripe_customer_id     = coalesce(p_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
    subscription_status    = p_status,
    subscription_plan      = coalesce(p_plan, subscription_plan),
    pro_until = case
      when p_period_end is null then pro_until
      else greatest(coalesce(pro_until, p_period_end), p_period_end)
    end
  where id = p_coach_id;
end;
$$;

-- Réservée au service role (routes serveur) — jamais exposée au client.
revoke all on function public.apply_pro_subscription(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
