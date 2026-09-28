// Transforme un texte libre en slug d'URL : minuscules, sans accents, espaces
// → tirets, caractères non alphanumériques retirés. Utilisé pour proposer le
// lien public madger.app/<slug> à partir du nom du coach.
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // tout le reste → tiret
    .replace(/^-+|-+$/g, ""); // pas de tiret en bord
}

// Valide qu'un slug est bien formé (ce qu'on accepte en base).
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Segments de premier niveau du site : un coach qui prendrait « blog » ou
// « coachs » comme lien partagerait une URL qui ne mène jamais à sa page
// (les routes statiques passent avant app/[slug]).
export const RESERVED_SLUGS = new Set([
  "acces", "admin", "api", "auth", "blog", "cgu", "cgv", "charte-paiement",
  "coachs", "coach", "contact", "dashboard", "espace", "exemple", "fonctionnalites",
  "grindars", "lancement", "login", "signup", "logout", "mentions-legales",
  "messages", "onboarding", "onboarding-client", "paiement", "politique-cookies",
  "politique-de-confidentialite", "reservation", "reset-password", "forgot-password",
  "application-coach-sportif", "robots.txt", "sitemap.xml", "manifest.webmanifest",
  "madger", "support", "aide", "faq", "tarifs", "pricing", "app", "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 60 && !isReservedSlug(slug);
}
