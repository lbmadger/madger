-- Pastilles du menu coach : date de dernière visite par section (factures,
-- paiements, avis), pour compter les nouveautés depuis. Écrite côté client :
-- grant par colonne, RLS coaches_update_own (auth.uid() = id).
alter table public.coaches
  add column if not exists nav_seen jsonb not null default '{}'::jsonb;
grant update (nav_seen) on public.coaches to authenticated;
