// Clé publique Stripe (publishable). Aucun repli en dur : un déploiement sans
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY doit échouer visiblement (paiement
// impossible) plutôt que retomber en silence sur un compte de test. La clé
// SECRÈTE (sk_...) reste UNIQUEMENT en variable d'env serveur.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
