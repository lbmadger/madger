-- Prospection coachs (emails pros affichés publiquement sur leur site).
-- Écrite et lue uniquement par le service role depuis l'admin : aucune
-- policy, RLS activée.
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text,
  ville text,
  specialite text,
  site text,
  email text not null unique,
  instagram text,
  source text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unsubscribed_at timestamptz
);
alter table public.prospects enable row level security;
revoke all on public.prospects from anon, authenticated;
