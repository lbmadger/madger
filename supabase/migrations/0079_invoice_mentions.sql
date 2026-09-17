-- Mentions de facture (0079).
-- 1. « EI » devant le nom : obligatoire sur les factures d'un entrepreneur
--    individuel depuis 2022. Vrai par défaut (la quasi-totalité des coachs),
--    décochable dans les réglages pour une société. Écrit côté client :
--    grant par colonne, RLS coaches_update_own.
alter table public.coaches
  add column if not exists entrepreneur_individuel boolean not null default true;
grant update (entrepreneur_individuel) on public.coaches to authenticated;

-- 2. Adresse de facturation du client, saisie par lui dans son profil
--    (client_profiles_owner_all couvre l'écriture). Lue à l'émission des
--    factures par email via une fonction SECURITY DEFINER : auth.users n'est
--    pas exposé à PostgREST, et seul le service role peut l'appeler.
alter table public.client_profiles
  add column if not exists billing_address text;

create or replace function public.client_billing_address(p_email text)
returns text
language sql
security definer
set search_path = public
as $$
  select cp.billing_address
  from public.client_profiles cp
  join auth.users u on u.id = cp.id
  where lower(u.email) = lower(p_email)
  limit 1
$$;
revoke all on function public.client_billing_address(text) from public, anon, authenticated;
