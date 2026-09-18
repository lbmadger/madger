-- Lien de lancement (madger.app/lancement) : code mémorisé à l'inscription et
-- rattaché au coach à la fin de l'onboarding, par le serveur (service role,
-- /api/offer/claim). Aucun grant côté client : un coach ne peut pas se
-- l'attribuer lui-même. Lu par /api/stripe/subscription pour appliquer le
-- coupon Stripe au premier abonnement.
alter table public.coaches
  add column if not exists launch_offer text,
  add column if not exists launch_offer_claimed_at timestamptz;
