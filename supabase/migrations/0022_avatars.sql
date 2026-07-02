-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Photos de profil des coachs (bucket Storage public)
-- À exécuter dans Supabase → SQL Editor → Run (après 0021).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Bucket public "avatars" : lecture par tous (photos affichées sur la
-- marketplace), écriture limitée au dossier de l'utilisateur (avatars/<uid>/…).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
