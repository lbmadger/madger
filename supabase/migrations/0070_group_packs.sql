-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Packs collectifs (cours collectifs, lot 2).
--
-- Un pack collectif est une prestation `pack` rattachée à une prestation
-- collective (services.group_service_id, migration 0068). Ses crédits ne
-- valent que pour les cours de cette prestation, jamais pour une séance
-- individuelle :
-- - pack_credit_consume (séance individuelle, coach ou client) ignore les
--   packs collectifs ;
-- - pack_credit_consume_from débite UN pack précis (place sur un cours).
-- À exécuter dans Supabase → SQL Editor → Run (après 0069).
-- ═══════════════════════════════════════════════════════════════════════════

-- Séance individuelle : seuls les packs individuels sont débités.
create or replace function public.pack_credit_consume(
  p_coach uuid, p_client uuid, p_booking uuid, p_actor text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_credit uuid;
begin
  update pack_credits
     set used = used + 1, updated_at = now()
   where id = (
     select pc.id from pack_credits pc
       left join services s on s.id = pc.service_id
      where pc.coach_id = p_coach
        and pc.client_id = p_client
        and pc.status = 'active'
        and pc.used < pc.total
        and (pc.expires_at is null or pc.expires_at > now())
        and (s.id is null or s.group_service_id is null)
      order by pc.expires_at asc nulls last, pc.created_at asc
      limit 1
      for update of pc skip locked
   )
     and used < total
  returning id into v_credit;
  if v_credit is null then return null; end if;

  update bookings set pack_credit_id = v_credit where id = p_booking;
  perform pack_credit_log(v_credit, p_booking, -1, 'booking',
                          coalesce(p_actor, 'system'), null);
  return v_credit;
end;
$$;

-- Place sur un cours : débite ce pack-là (vérifié actif, non expiré, avec
-- crédit). Service role uniquement.
create or replace function public.pack_credit_consume_from(
  p_pack uuid, p_booking uuid, p_actor text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_credit uuid;
begin
  update pack_credits
     set used = used + 1, updated_at = now()
   where id = p_pack
     and status = 'active'
     and used < total
     and (expires_at is null or expires_at > now())
  returning id into v_credit;
  if v_credit is null then return null; end if;

  update bookings set pack_credit_id = v_credit where id = p_booking;
  perform pack_credit_log(v_credit, p_booking, -1, 'booking',
                          coalesce(p_actor, 'system'), null);
  return v_credit;
end;
$$;
revoke all on function public.pack_credit_consume_from(uuid, uuid, text)
  from public, anon, authenticated;
