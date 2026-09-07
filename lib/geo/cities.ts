// Recherche de communes françaises via l'API officielle (geo.api.gouv.fr),
// gratuite et sans clé. Fournit l'autocomplétion + les coordonnées.

export type City = {
  name: string;
  lat: number;
  lng: number;
  dept: string | null;
};

const ENDPOINT = "https://geo.api.gouv.fr/communes";

// Forme (partielle) d'une commune renvoyée par l'API.
type Commune = {
  nom: string;
  centre?: { coordinates?: [number, number] };
  departement?: { code?: string };
};

// « Paris 15e Arrondissement » → « Paris 15e » : plus court, et c'est ce
// que tout le monde tape.
function shortName(nom: string): string {
  return nom.replace(/\s+Arrondissement$/i, "");
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Suggestions pour l'autocomplétion (triées par population). Les
// arrondissements de Paris, Lyon et Marseille sont inclus : un coach du 15e
// n'est pas « à Paris » au sens de l'annuaire, il est dans le 15e.
export async function searchCities(query: string): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${ENDPOINT}?nom=${encodeURIComponent(q)}&fields=nom,centre,departement&type=commune-actuelle,arrondissement-municipal&boost=population&limit=12`
    );
    if (!res.ok) return [];
    const data: Commune[] = await res.json();
    const list = (Array.isArray(data) ? data : [])
      .map((c): City | null => {
        const coords = c?.centre?.coordinates;
        if (!coords) return null;
        return {
          name: shortName(c.nom),
          lat: coords[1],
          lng: coords[0],
          dept: c?.departement?.code ?? null,
        };
      })
      .filter((c): c is City => c !== null);
    // « paris 15 » doit proposer Paris 15e en premier, pas Paris puis dix
    // autres communes : ce qui commence par la saisie passe devant.
    const nq = norm(q);
    const starts = list.filter((c) => norm(c.name).startsWith(nq));
    const rest = list.filter((c) => !norm(c.name).startsWith(nq));
    return [...starts, ...rest].slice(0, 8);
  } catch {
    return [];
  }
}

// Géocode la meilleure correspondance d'un nom de ville (pour la recherche
// par rayon quand l'utilisateur a tapé sans choisir de suggestion).
export async function geocodeCity(
  name: string
): Promise<{ lat: number; lng: number } | null> {
  const list = await searchCities(name);
  return list.length ? { lat: list[0].lat, lng: list[0].lng } : null;
}

// Distance en km entre deux points (formule de haversine).
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
