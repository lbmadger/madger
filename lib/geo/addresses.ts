// Recherche d'adresses postales françaises via la Base Adresse Nationale
// (api-adresse.data.gouv.fr), gratuite et sans clé. Renvoie l'adresse
// complète, numéro, rue, code postal et ville, prête à mettre sur une
// facture.

export type Address = {
  // « 12 Rue de Rivoli 75004 Paris »
  label: string;
  street: string;
  postcode: string;
  city: string;
  // Coordonnées GPS de l'adresse (WGS84), quand la BAN les renvoie.
  lat?: number;
  lng?: number;
};

const ENDPOINT = "https://api-adresse.data.gouv.fr/search/";

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
    type?: string;
    score?: number;
  };
};

// La BAN renvoie toujours ses « meilleures » propositions, même quand la
// saisie n'a rien d'une adresse (nom de salle, faute de frappe) : on ne garde
// que ce qui ressemble vraiment à ce que le coach a tapé, sinon « aucune
// adresse trouvée » vaut mieux qu'une adresse qui n'a rien à voir.
const STOP = new Set([
  "rue", "avenue", "av", "bd", "boulevard", "place", "chemin", "allee", "impasse",
  "route", "quai", "cours", "square", "de", "du", "des", "la", "le", "les", "l", "d",
  "et", "sur", "sous", "saint", "sainte", "st", "ste",
]);
const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function looksLike(query: string, label: string, score?: number): boolean {
  if (typeof score === "number" && score >= 0.6) return true;
  const q = norm(query).split(" ").filter(Boolean);
  const words = norm(label).split(" ").filter(Boolean);
  const numbers = q.filter((t) => /^\d+$/.test(t));
  const letters = q.filter((t) => !/^\d+$/.test(t) && t.length >= 3 && !STOP.has(t));
  // Chaque numéro tapé doit être dans l'adresse (numéro de voie, code postal).
  if (numbers.some((n) => !words.some((w) => w === n || (n.length >= 2 && w.startsWith(n))))) return false;
  if (letters.length === 0) return typeof score !== "number" || score >= 0.3;
  // Chaque mot significatif tapé doit commencer un mot de l'adresse.
  const hits = letters.filter((t) => words.some((w) => w.startsWith(t))).length;
  return hits === letters.length || (letters.length >= 3 && hits >= letters.length - 1);
}

export async function searchAddresses(query: string): Promise<Address[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const res = await fetch(
      `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const feats: Feature[] = Array.isArray(data?.features) ? data.features : [];
    return feats
      .map((f): Address | null => {
        const p = f.properties;
        if (!p?.label || !p.postcode || !p.city) return null;
        if (!looksLike(q, p.label, p.score)) return null;
        const coords = f.geometry?.coordinates;
        const hasCoords =
          Array.isArray(coords) &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number";
        return {
          label: p.label,
          street: p.name ?? "",
          postcode: p.postcode,
          city: p.city,
          ...(hasCoords ? { lng: coords[0], lat: coords[1] } : {}),
        };
      })
      .filter((a): a is Address => a !== null);
  } catch {
    return [];
  }
}
