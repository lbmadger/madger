// Prénom / nom déduits des métadonnées d'un compte OAuth. Google renvoie
// given_name / family_name (et full_name / name en secours). Sert à
// pré-remplir l'onboarding : on ne fait pas retaper ce que le fournisseur
// connaît déjà.

type Meta = Record<string, unknown> | null | undefined;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function nameFromMetadata(meta: Meta): {
  firstName: string;
  lastName: string;
} {
  const m = (meta ?? {}) as Record<string, unknown>;
  let firstName = str(m.given_name) || str(m.first_name);
  let lastName = str(m.family_name) || str(m.last_name);
  // Certains fournisseurs ne donnent qu'un nom complet : on le découpe
  // (premier mot = prénom, le reste = nom).
  if (!firstName && !lastName) {
    const full = str(m.full_name) || str(m.name);
    if (full) {
      const parts = full.split(/\s+/);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ");
    }
  }
  return { firstName, lastName };
}
