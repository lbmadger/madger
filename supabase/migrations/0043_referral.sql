-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Parrainage coach → coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0042).
-- ═══════════════════════════════════════════════════════════════════════════
-- Chaque coach a un code de parrainage. Quand son filleul passe Pro pour la
-- première fois, les deux gagnent 1 mois de Pro. La récompense côté argent est
-- appliquée par le webhook Stripe (crédit de 49 € sur le solde client s'il est
-- abonné, sinon accès Pro gratuit via pro_bonus_until).

alter table public.coaches
  add column if not exists referral_code       text,
  add column if not exists referred_by         uuid references public.coaches(id),
  add column if not exists referral_rewarded_at timestamptz,
  -- Accès Pro OFFERT (parrainage, gestes commerciaux) : indépendant de Stripe.
  -- Le "Pro effectif" = max(pro_until, pro_bonus_until). Comme pro_until n'est
  -- jamais raccourci par Stripe (apply_pro_subscription prend le greatest), ce
  -- champ séparé évite tout conflit avec la facturation.
  add column if not exists pro_bonus_until      timestamptz;

-- Unicité du code (sur les valeurs non nulles).
create unique index if not exists coaches_referral_code_key
  on public.coaches (referral_code)
  where referral_code is not null;

-- Code court unique posé à la création (et rétro-rempli). 8 hex → collision
-- négligeable à l'échelle visée ; l'index unique protège en dernier recours.
create or replace function public.set_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end $$;

drop trigger if exists coaches_set_referral_code on public.coaches;
create trigger coaches_set_referral_code
  before insert on public.coaches
  for each row execute function public.set_referral_code();

update public.coaches
   set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
 where referral_code is null;

-- Offre 1 mois d'accès Pro gratuit (parrain sans abonnement actif). Additif :
-- s'empile sur un bonus déjà en cours. Réservée au service role.
create or replace function public.grant_pro_bonus_month(p_coach_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update coaches
     set pro_bonus_until = greatest(coalesce(pro_bonus_until, now()), now())
                           + interval '1 month'
   where id = p_coach_id;
end $$;

revoke all on function public.grant_pro_bonus_month(uuid) from public, anon, authenticated;
