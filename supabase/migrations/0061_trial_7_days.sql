-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Essai Pro ramené à 7 jours, codes fondateurs à 1 mois.
-- À exécuter dans Supabase → SQL Editor → Run (après 0060).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un coach en essai Pro coûte à la plateforme (frais Connect, 0,25 % sur
-- ses virements) sans rien rapporter : l'essai est borné à 7 jours, et les
-- codes de la liste fermée des fondateurs offrent 1 mois au lieu de 3.
-- Reprend handle_new_user de 0049 à l'identique, seule la durée change.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  r record;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  if v_role = 'coach' then
    -- Essai Pro offert : 7 jours de commission à 0 %.
    insert into public.coaches (id, pro_until)
    values (new.id, now() + interval '7 days')
    on conflict (id) do nothing;
  else
    -- Client : relie ses fiches CRM (réservations invité) et ouvre les convs.
    begin
      if new.email is not null then
        for r in
          select
            cl.id as crm_id,
            cl.coach_id,
            coalesce(
              nullif(trim(co.first_name || ' ' || coalesce(co.last_name, '')), ''),
              'Coach'
            ) as coach_name,
            nullif(trim(cl.first_name || ' ' || coalesce(cl.last_name, '')), '')
              as client_name
          from public.clients cl
          join public.coaches co on co.id = cl.coach_id
          where lower(cl.email) = lower(new.email)
        loop
          insert into public.conversations
            (coach_id, client_id, client_crm_id, coach_name, client_name)
          values
            (r.coach_id, new.id, r.crm_id, r.coach_name,
             coalesce(r.client_name, new.raw_user_meta_data->>'full_name'))
          on conflict (coach_id, client_id)
            do update set client_crm_id = excluded.client_crm_id;
        end loop;
      end if;
    exception when others then
      null; -- ne jamais bloquer l'inscription
    end;
  end if;

  return new;
end;
$$;

-- Codes fondateurs pas encore utilisés : 1 mois au lieu de 3.
update public.promo_codes
   set months = 1
 where active = true and used_count = 0 and months = 3;
