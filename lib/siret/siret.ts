// SIRET d'un coach : validation hors ligne (14 chiffres + clé de Luhn) puis
// vérification d'existence via l'API publique recherche-entreprises
// (annuaire-entreprises.data.gouv.fr, sans clé). Un SIRET inexistant sur une
// facture engage le coach ET Madger : on refuse de l'enregistrer. Si l'API
// est indisponible, on enregistre sans vérifier plutôt que de bloquer le
// coach, et la vérification sera retentée à la prochaine saisie.

export function cleanSiret(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

// 14 chiffres et clé de Luhn (les SIRET de La Poste font exception : somme
// des chiffres multiple de 5, cas marginal accepté aussi).
export function isValidSiret(raw: string): boolean {
  const s = cleanSiret(raw);
  if (!/^\d{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(s[i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  if (sum % 10 === 0) return true;
  if (s.startsWith("356000000")) {
    const plain = s.split("").reduce((a, c) => a + Number(c), 0);
    return plain % 5 === 0;
  }
  return false;
}

export type SiretLookup =
  | { status: "found"; legalName: string; active: boolean; city: string | null }
  | { status: "not_found" }
  | { status: "unavailable" };

type ApiEtab = {
  siret?: string;
  etat_administratif?: string;
  libelle_commune?: string;
  est_siege?: boolean;
};
type ApiResult = {
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: ApiEtab;
  matching_etablissements?: ApiEtab[];
};

const API = "https://recherche-entreprises.api.gouv.fr/search";

export async function lookupSiret(raw: string, fetchImpl: typeof fetch = fetch): Promise<SiretLookup> {
  const siret = cleanSiret(raw);
  if (!isValidSiret(siret)) return { status: "not_found" };
  try {
    const res = await fetchImpl(`${API}?q=${siret}&page=1&per_page=1`, {
      signal: AbortSignal.timeout(6_000),
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "unavailable" };
    const json = (await res.json()) as { results?: ApiResult[] };
    const r = json.results?.[0];
    if (!r) return { status: "not_found" };
    const etab =
      r.matching_etablissements?.find((e) => e.siret === siret) ??
      (r.siege?.siret === siret ? r.siege : undefined);
    if (!etab) return { status: "not_found" };
    const legalName = (r.nom_complet || r.nom_raison_sociale || "").trim();
    if (!legalName) return { status: "not_found" };
    return {
      status: "found",
      legalName: titleCase(legalName),
      active: etab.etat_administratif !== "F",
      city: etab.libelle_commune ? titleCase(etab.libelle_commune) : null,
    };
  } catch {
    return { status: "unavailable" };
  }
}

// L'API renvoie tout en capitales ; on remet en forme pour l'affichage (le
// coach peut toujours corriger sa raison sociale dans ses réglages).
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'’(])([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase())
    .replace(/\b(Sas|Sarl|Sasu|Eurl|Sa|Sci|Ei)\b/g, (m) => m.toUpperCase());
}
