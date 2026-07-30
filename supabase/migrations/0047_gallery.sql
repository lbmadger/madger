-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Galerie « Résultats » des coachs (photos avant/après)
-- À exécuter dans Supabase → SQL Editor → Run (après 0046).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Le coach publie jusqu'à 6 photos de résultats (avec l'accord de ses
-- clients) : elles s'affichent sur sa page publique, section Résultats.

create table if not exists public.coach_photos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists coach_photos_coach_idx
  on public.coach_photos (coach_id, created_at);

alter table public.coach_photos enable row level security;

-- Lecture publique : les photos vivent sur la page publique du coach.
drop policy if exists coach_photos_public_read on public.coach_photos;
create policy coach_photos_public_read on public.coach_photos
  for select using (true);

-- Le coach gère uniquement ses propres photos (coach.id = auth.uid()).
drop policy if exists coach_photos_owner_insert on public.coach_photos;
create policy coach_photos_owner_insert on public.coach_photos
  for insert to authenticated
  with check (coach_id = auth.uid());

drop policy if exists coach_photos_owner_update on public.coach_photos;
create policy coach_photos_owner_update on public.coach_photos
  for update to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_photos_owner_delete on public.coach_photos;
create policy coach_photos_owner_delete on public.coach_photos
  for delete to authenticated
  using (coach_id = auth.uid());

-- Grants : la RLS ne suffit pas, chaque table doit lister les siens.
grant select on public.coach_photos to anon, authenticated;
grant insert (coach_id, url, caption) on public.coach_photos to authenticated;
grant update (caption) on public.coach_photos to authenticated;
grant delete on public.coach_photos to authenticated;

-- Bucket Storage public « gallery » : lecture par tous, écriture limitée au
-- dossier de l'utilisateur (gallery/<uid>/…), comme les avatars.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists gallery_public_read on storage.objects;
create policy gallery_public_read on storage.objects
  for select using (bucket_id = 'gallery');

drop policy if exists gallery_owner_insert on storage.objects;
create policy gallery_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists gallery_owner_update on storage.objects;
create policy gallery_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists gallery_owner_delete on storage.objects;
create policy gallery_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
