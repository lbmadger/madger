-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Abonnement (Free/Pro) + codes promo (accès anticipé = 3 mois Pro)
-- À exécuter dans Supabase → SQL Editor → Run (après 0009).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un coach est "Pro" tant que pro_until est dans le futur (via code promo,
-- essai, ou plus tard abonnement Stripe). Sinon il est "Free".

alter table public.coaches add column if not exists pro_until timestamptz;

-- ── Codes promo ─────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  code       text primary key,
  months     int not null default 3,
  max_uses   int,                      -- null = illimité
  used_count int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
-- RLS active SANS policy : personne ne lit la table directement. La validation
-- passe uniquement par la fonction redeem_promo (security definer).
alter table public.promo_codes enable row level security;

-- Redemption d'un code : étend pro_until du coach connecté.
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_row   public.promo_codes;
  v_new   timestamptz;
  v_uid   uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_row from promo_codes
   where lower(code) = lower(trim(p_code)) and active = true;
  if v_row.code is null then raise exception 'invalid_code'; end if;

  if v_row.max_uses is not null and v_row.used_count >= v_row.max_uses then
    raise exception 'code_exhausted';
  end if;

  -- Cumule à partir du max(maintenant, pro_until actuel).
  select greatest(coalesce(pro_until, now()), now())
         + make_interval(months => v_row.months)
    into v_new
    from coaches where id = v_uid;
  if v_new is null then raise exception 'not_a_coach'; end if;

  update coaches set pro_until = v_new where id = v_uid;
  update promo_codes set used_count = used_count + 1 where code = v_row.code;
  return v_new;
end;
$$;
grant execute on function public.redeem_promo(text) to authenticated;

-- Code d'accès anticipé : 3 mois Pro offerts. Volontairement difficile à
-- deviner (à ne partager qu'aux membres early access).
insert into public.promo_codes (code, months, active)
values ('MADGER-EARLY-K7Q9X2F4', 3, true)
on conflict (code) do nothing;
