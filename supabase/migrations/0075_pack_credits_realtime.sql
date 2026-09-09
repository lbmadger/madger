-- Temps réel sur pack_credits : la cloche du coach sonne dès qu'un client
-- demande le remboursement du reste de son pack (RLS respectée : le coach ne
-- reçoit que ses propres lignes).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pack_credits'
  ) then
    alter publication supabase_realtime add table public.pack_credits;
  end if;
end $$;
