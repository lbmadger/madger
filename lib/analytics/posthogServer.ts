// Requêtes HogQL vers l'API PostHog, côté serveur uniquement (clé secrète,
// jamais exposée au navigateur). Renvoie les lignes brutes, ou null si non
// configuré / en erreur : la page admin affiche alors les instructions au
// lieu de planter.

const HOST = process.env.POSTHOG_API_HOST || "https://eu.posthog.com";

export function posthogServerConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PROJECT_ID && process.env.POSTHOG_API_KEY
  );
}

export async function phQuery(query: string): Promise<unknown[][] | null> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!projectId || !apiKey) return null;
  try {
    const res = await fetch(`${HOST}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      // Les chiffres de trafic n'ont pas besoin d'être à la seconde près :
      // 5 minutes de cache évitent de ralentir la page admin.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: unknown[][] };
    return json.results ?? null;
  } catch {
    return null;
  }
}
