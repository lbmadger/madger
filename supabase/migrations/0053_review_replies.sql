-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Avis façon Vinted : réponse publique du coach + modération admin
-- À exécuter dans Supabase → SQL Editor → Run (après 0052).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un avis défavorable n'est plus un mur : le coach peut y répondre
-- publiquement (sa réponse s'affiche sous l'avis), et signaler un avis
-- abusif que l'admin peut masquer. Un avis masqué disparaît de la page
-- publique ET du calcul de la note moyenne. Jamais de suppression par le
-- coach lui-même : la confiance des clients repose là-dessus.

alter table public.reviews
  add column if not exists reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists hidden boolean not null default false;

-- Le coach ne peut modifier QUE sa réponse (grant par colonne) sur SES avis.
revoke update on public.reviews from anon, authenticated;
grant update (reply, replied_at) on public.reviews to authenticated;
drop policy if exists reviews_coach_reply on public.reviews;
create policy reviews_coach_reply on public.reviews
  for update using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- Note moyenne et compteur : les avis masqués ne comptent plus.
create or replace function public.refresh_coach_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_coach uuid := coalesce(new.coach_id, old.coach_id);
begin
  update coaches c
     set rating_avg = (select round(avg(r.rating)::numeric, 1)
                         from reviews r
                        where r.coach_id = v_coach and not r.hidden),
         rating_count = (select count(*)::int
                           from reviews r
                          where r.coach_id = v_coach and not r.hidden)
   where c.id = v_coach;
  return coalesce(new, old);
end;
$$;

-- Vue publique : la réponse du coach s'affiche, les avis masqués non.
drop view if exists public.public_reviews;
create view public.public_reviews as
  select r.id, r.coach_id, r.rating, r.comment, r.created_at,
         r.reply, r.replied_at,
         c.first_name as client_first_name
  from public.reviews r
  join public.clients c on c.id = r.client_id
  where not r.hidden;
grant select on public.public_reviews to anon, authenticated;
