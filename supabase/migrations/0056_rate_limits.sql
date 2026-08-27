-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Rate limiting persistant (partagé entre instances serverless)
-- À exécuter dans Supabase → SQL Editor → Run (après 0055).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Faille (audit) : plusieurs routes non authentifiées (avis, signalement,
-- inscription early-access) limitaient les abus avec une Map en mémoire. Sur
-- Vercel chaque lambda a sa propre Map : un attaquant réparti sur plusieurs
-- instances passe à travers. On stocke désormais le compteur en base, commun
-- à toutes les instances, via un RPC atomique.

create table if not exists public.rate_limits (
  bucket       text        not null,   -- famille de limite, ex. 'reviews'
  key          text        not null,   -- clé dans cette famille (IP, email…)
  window_start timestamptz not null default now(),
  count        int         not null default 0,
  primary key (bucket, key)
);

-- Pas de policy : la table n'est jamais touchée par anon/authenticated. Le RPC
-- (security definer) est le seul point d'accès, appelé côté serveur via le
-- service role.
alter table public.rate_limits enable row level security;

-- Incrémente le compteur de (bucket, key) et renvoie true si la requête est
-- AUTORISÉE (compteur ≤ max dans la fenêtre glissante), false sinon. La
-- fenêtre est réinitialisée dès qu'elle a expiré. Atomique : l'upsert
-- verrouille la ligne, pas de course entre instances.
create or replace function public.rate_limit_hit(
  p_bucket         text,
  p_key            text,
  p_max            int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limits as rl (bucket, key, window_start, count)
  values (p_bucket, p_key, now(), 1)
  on conflict (bucket, key) do update
    set
      count = case
                when rl.window_start < now() - make_interval(secs => p_window_seconds)
                then 1
                else rl.count + 1
              end,
      window_start = case
                when rl.window_start < now() - make_interval(secs => p_window_seconds)
                then now()
                else rl.window_start
              end
  returning rl.count into v_count;

  return v_count <= p_max;
end;
$$;

-- Réservé au service role (appel serveur). Jamais exposé au client.
revoke all on function public.rate_limit_hit(text, text, int, int) from public;
revoke all on function public.rate_limit_hit(text, text, int, int) from anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, int, int) to service_role;

-- Purge : index pour permettre un nettoyage périodique des vieilles entrées.
create index if not exists rate_limits_window_idx on public.rate_limits(window_start);
