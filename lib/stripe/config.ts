// Clé publique Stripe (publishable) — publique par conception, comme la clé
// anon Supabase : on la met en repli pour que le front marche sur tout
// déploiement. La clé SECRÈTE (sk_...) reste UNIQUEMENT en variable d'env
// serveur, jamais dans le code.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  "pk_test_51Sn2MvHX9nD7CvtBLPIlK2YjNq1ILQyfyYkpXPV6Ii3iQQfDVZxFgGSfKLrwg7CTlGWyWdzbJZmfgjv3DBVOfUsd00bIHYB37x";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
