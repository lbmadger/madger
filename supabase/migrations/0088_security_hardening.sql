-- 0088 : durcissements issus de l'audit de lancement (sécurité).

-- 1. coaches : un compte ne crée que SA ligne, avec son seul identifiant.
--    Le grant INSERT couvrait toutes les colonnes (pro_until,
--    verification_status, rating_avg, stripe_*…) : un compte client pouvait
--    se fabriquer une fiche coach Pro « vérifiée ». Le code n'insère jamais
--    que l'id (auth/callback, auth/confirm) ; handle_new_user est SECURITY
--    DEFINER. Les privilèges DELETE / TRUNCATE / TRIGGER / REFERENCES hérités
--    des droits par défaut sont retirés (aucune policy ne les porte).
revoke insert, delete, truncate, trigger, references on public.coaches from anon, authenticated;
grant insert (id) on public.coaches to authenticated;

-- 2. conversations : seule la personne qui écrit à un coach (le client)
--    ouvre une conversation, avec elle-même comme client_id ; les deux
--    participants lisent, et ne modifient que leurs marqueurs de lecture.
--    Avant : ALL pour tout participant, INSERT et UPDATE sur toutes les
--    colonnes, donc n'importe quel compte pouvait s'inventer une conversation
--    « coach » avec un client_id ciblé et lire sa fiche santé via
--    client_profiles_coach_read. last_message_at est posé par le trigger
--    bump_conversation (SECURITY DEFINER), les notifications par le serveur.
drop policy if exists conversations_participant on public.conversations;
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_insert_client on public.conversations;
drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_select on public.conversations
  for select using (auth.uid() = coach_id or auth.uid() = client_id);
create policy conversations_insert_client on public.conversations
  for insert with check (
    auth.uid() = client_id
    and auth.uid() <> coach_id
    and exists (select 1 from public.coaches c where c.id = coach_id)
  );
create policy conversations_update_participant on public.conversations
  for update using (auth.uid() = coach_id or auth.uid() = client_id)
  with check (auth.uid() = coach_id or auth.uid() = client_id);
revoke insert, update, delete, truncate, trigger, references on public.conversations from anon, authenticated;
grant insert (coach_id, client_id, coach_name, client_name) on public.conversations to authenticated;
grant update (client_last_read_at, coach_last_read_at) on public.conversations to authenticated;

-- 3. rate_limit_hit : compteur partagé, appelé par le serveur (service role)
--    uniquement. Exposé à anon, il permettrait de saturer la clé d'une
--    victime ou de gonfler les compteurs.
revoke execute on function public.rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;

-- 4. search_path figé sur les fonctions trigger restantes (avis Supabase).
alter function public.set_referral_code() set search_path = public;
alter function public.guard_verification_status() set search_path = public;
alter function public.services_group_check() set search_path = public;
alter function public.group_sessions_no_overlap() set search_path = public;
alter function public.coaches_track_offline() set search_path = public;
alter function public.coaches_reset_siret_verification() set search_path = public;

-- 5. Storage : un bucket public sert ses fichiers par URL sans policy
--    SELECT ; la policy de lecture anonyme ne servait qu'à LISTER les
--    dossiers, donc les identifiants de tous les comptes ayant une photo.
--    Le propriétaire garde la lecture de ses fichiers (suppression,
--    remplacement). Taille et types plafonnés côté bucket : les contrôles
--    des composants se contournent par appel direct.
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists gallery_public_read on storage.objects;
drop policy if exists avatars_owner_read on storage.objects;
drop policy if exists gallery_owner_read on storage.objects;
create policy avatars_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gallery_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
update storage.buckets
   set file_size_limit = 10485760, allowed_mime_types = array['image/*']
 where id in ('avatars', 'gallery');
update storage.buckets
   set file_size_limit = 10485760, allowed_mime_types = array['image/*', 'application/pdf']
 where id = 'diplomas';
