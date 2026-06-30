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

// Suggestions pour l'autocomplétion (triées par population).
export async function searchCities(query: string): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${ENDPOINT}?nom=${encodeURIComponent(q)}&fields=nom,centre,departement&boost=population&limit=7`
    );
    if (!res.ok) return [];
    const data: Commune[] = await res.json();
    return (Array.isArray(data) ? data : [])
      .map((c): City | null => {
        const coords = c?.centre?.coordinates;
        if (!coords) return null;
        return {
          name: c.nom,
          lat: coords[1],
          lng: coords[0],
          dept: c?.departement?.code ?? null,
        };
      })
      .filter((c): c is City => c !== null);
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
