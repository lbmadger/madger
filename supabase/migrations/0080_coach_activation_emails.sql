-- Séquence d'activation après inscription (0080), pour les coachs dont la
-- configuration est terminée : J+0 « ton lien est prêt », J+2 « mets-le dans
-- ta bio » (aucune réservation), J+7 « ton premier client a-t-il réservé ? »
-- (aucun paiement). Un horodatage par email : un cron rejoué ne double jamais.
alter table public.coaches
  add column if not exists activation_email1_at timestamptz,
  add column if not exists activation_email2_at timestamptz,
  add column if not exists activation_email3_at timestamptz;
