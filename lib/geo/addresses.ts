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
};

const ENDPOINT = "https://api-adresse.data.gouv.fr/search/";

type Feature = {
  properties?: {
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
    type?: string;
  };
};

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
        return {
          label: p.label,
          street: p.name ?? "",
          postcode: p.postcode,
          city: p.city,
        };
      })
      .filter((a): a is Address => a !== null);
  } catch {
    return [];
  }
}
