import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Recherche de VRAIES salles de sport (OpenStreetMap via Nominatim, gratuit
// et sans clé). Le coach tape le nom de sa salle, choisit dans la liste, et
// la salle validée (nom + adresse + coordonnées) est enregistrée sur son
// profil : c'est la base de la carte des coachs.
//
// Respect de la politique Nominatim : User-Agent identifiable, cache mémoire
// par requête (1 h) et rate limit par IP.

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20; // 20 recherches / min / IP
const rateMap = new Map<string, { count: number; start: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

type Gym = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const cache = new Map<string, { at: number; gyms: Gym[] }>();
const CACHE_MS = 60 * 60 * 1000;

type NominatimRow = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
};

// Types OSM correspondant à des lieux d'entraînement.
const GYM_TYPES = new Set([
  "fitness_centre",
  "fitness_station",
  "gym",
  "sports_centre",
  "sports_hall",
  "dojo",
  "swimming_pool",
  "boxing",
  "climbing",
]);

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ gyms: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ gyms: hit.gyms });
  }

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=fr&limit=10&addressdetails=1&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Madger/1.0 (contact@madger.app)",
        "Accept-Language": "fr",
      },
      // Le cache Next évite de re-taper Nominatim pour la même recherche.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ gyms: [] });
    const rows: NominatimRow[] = await res.json();

    const gyms: Gym[] = (Array.isArray(rows) ? rows : [])
      .filter(
        (r) =>
          // Salles identifiées comme telles par OSM, ou résultats nommés de
          // type loisir (les enseignes sont souvent taguées leisure=*).
          (r.type && GYM_TYPES.has(r.type)) ||
          r.class === "leisure" ||
          r.class === "amenity"
      )
      .map((r): Gym | null => {
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const a = r.address ?? {};
        const address = [
          [a.house_number, a.road].filter(Boolean).join(" "),
          a.postcode,
          a.city || a.town || a.village || a.municipality,
        ]
          .filter(Boolean)
          .join(", ");
        const name =
          r.name || (r.display_name ?? "").split(",")[0] || "Salle de sport";
        return {
          id: `${r.osm_type ?? "n"}${r.osm_id ?? r.place_id ?? 0}`,
          name,
          address,
          lat,
          lng,
        };
      })
      .filter((g): g is Gym => g !== null)
      .slice(0, 7);

    cache.set(key, { at: Date.now(), gyms });
    return NextResponse.json({ gyms });
  } catch {
    return NextResponse.json({ gyms: [] });
  }
}
