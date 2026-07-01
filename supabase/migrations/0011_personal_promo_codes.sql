-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Codes promo personnels (1 par membre, usage unique, lié à l'email)
-- À exécuter dans Supabase → SQL Editor → Run (après 0010).
-- ═══════════════════════════════════════════════════════════════════════════

-- Chaque code peut être rattaché à un email : seul ce compte pourra l'utiliser.
alter table public.promo_codes add column if not exists email text;

-- Redemption durcie : usage unique (max_uses) + liaison à l'email si défini.
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_row   public.promo_codes;
  v_new   timestamptz;
  v_uid   uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_row from promo_codes
   where lower(code) = lower(trim(p_code)) and active = true;
  if v_row.code is null then raise exception 'invalid_code'; end if;

  if v_row.max_uses is not null and v_row.used_count >= v_row.max_uses then
    raise exception 'code_exhausted';
  end if;

  -- Liaison à l'email : le code n'est utilisable que par le bon compte.
  if v_row.email is not null then
    select email into v_email from auth.users where id = v_uid;
    if v_email is null or lower(v_email) <> lower(v_row.email) then
      raise exception 'code_not_yours';
    end if;
  end if;

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

-- On désactive l'ancien code partagé (devinable / non lié).
update public.promo_codes set active = false
 where code in ('EARLY3', 'MADGER-EARLY-K7Q9X2F4');

-- ── Génère 1 code personnel par membre early access ─────────────────────────
-- Usage unique, lié à l'email de la landing. Idempotent : ne recrée pas de
-- code pour un email qui en a déjà un.
insert into public.promo_codes (code, months, max_uses, active, email)
select
  'MDG-' || upper(substr(md5(random()::text || ea.email || clock_timestamp()::text), 1, 12)),
  3, 1, true, ea.email
from public.early_access ea
where ea.email is not null
  and not exists (
    select 1 from public.promo_codes pc where lower(pc.email) = lower(ea.email)
  );
