-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Essai Pro offert : 14 jours de Pro à chaque nouveau compte coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0048).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le coach goûte au 0 % de commission dès son inscription : revenir au 5 %
-- à la fin de l'essai est le meilleur argument de conversion vers Pro.
-- Reprend handle_new_user de 0008 à l'identique, seule la création du coach
-- change (pro_until = maintenant + 14 jours). Comptes existants inchangés.

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
    -- Essai Pro offert : 14 jours de commission a 0 %.
    insert into public.coaches (id, pro_until)
    values (new.id, now() + interval '14 days')
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
