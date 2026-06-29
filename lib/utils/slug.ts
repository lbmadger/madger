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

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 60;
}
