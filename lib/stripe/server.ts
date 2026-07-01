import Stripe from "stripe";

// Client Stripe côté serveur. La clé secrète vient d'une variable d'env
// (jamais en dur). `getStripe()` renvoie null si la clé n'est pas configurée,
// pour dégrader proprement au lieu de planter (ex: sur un env sans la clé).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}
