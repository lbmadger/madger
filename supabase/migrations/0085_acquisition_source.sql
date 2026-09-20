-- D'où vient un coach : code passé dans l'URL d'inscription (madger.app/grindars,
-- /lancement, un post de groupe…), mémorisé à l'inscription et posé sur le
-- compte par le serveur à la fin de l'onboarding. Pour mesurer les canaux.
alter table public.coaches
  add column if not exists acquisition_source text;
