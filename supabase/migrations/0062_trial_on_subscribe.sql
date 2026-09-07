-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · L'essai Pro de 7 jours se prend en S'ABONNANT (carte enregistrée,
-- rien débité pendant 7 jours, puis renouvellement automatique sauf
-- résiliation). Plus d'essai automatique à l'inscription.
-- À exécuter dans Supabase → SQL Editor → Run (après 0061).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un coach qui s'inscrit sans s'abonner est en Gratuit (5 %). L'essai est
-- porté par l'abonnement Stripe (trial_period_days = 7) : c'est Stripe qui
-- renouvelle tout seul. Un seul essai par coach (pro_trial_used_at).

alter table public.coaches
  add column if not exists pro_trial_used_at timestamptz;

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
    -- Plus d'essai automatique : l'essai de 7 jours démarre avec l'abonnement.
    insert into public.coaches (id)
    values (new.id)
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
