-- 0087 : marqueurs écrits par le serveur uniquement (service role).
--
-- 1. weekly_recap_sent_at : idempotence du récap hebdo. Le lundi, le cron
--    quotidien ET un éventuel déclencheur externe appellent runWeeklyRecap ;
--    sans marqueur, un coach recevait le même récap deux fois.
-- 2. founder_bonus_granted_at : le mois de Pro offert aux membres fondateurs
--    (inscrits en accès anticipé avant l'ouverture) n'est posé qu'une fois.
--
-- Aucun grant à authenticated : les mises à jour de coaches sont accordées
-- colonne par colonne (0035 et suivantes), ces deux-là restent serveur.
alter table public.coaches
  add column if not exists weekly_recap_sent_at timestamptz,
  add column if not exists founder_bonus_granted_at timestamptz;
