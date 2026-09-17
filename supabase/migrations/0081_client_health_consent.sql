-- Consentement explicite aux données de santé du profil client (taille,
-- poids, IMC, objectifs, niveau, note), article 9 du RGPD. Horodaté à la
-- case cochée ; sans consentement, ces champs ne sont pas enregistrés.
-- Écrit par le client lui-même (client_profiles_owner_all).
alter table public.client_profiles
  add column if not exists health_consent_at timestamptz;
