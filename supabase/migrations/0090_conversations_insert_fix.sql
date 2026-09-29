-- 0090 : la policy d'ouverture de conversation (0088) testait l'existence du
-- coach en lisant public.coaches, que le client n'a pas le droit de lire
-- (coaches_select_own) : EXISTS était toujours faux, aucune conversation ne
-- pouvait plus être ouverte. La clé étrangère conversations.coach_id →
-- coaches(id) garantit déjà l'existence : le test est retiré.
drop policy if exists conversations_insert_client on public.conversations;
create policy conversations_insert_client on public.conversations
  for insert with check (auth.uid() = client_id and auth.uid() <> coach_id);
