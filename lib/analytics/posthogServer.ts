// Requêtes HogQL vers l'API PostHog, côté serveur uniquement (clé secrète,
// jamais exposée au navigateur). En cas d'échec, l'ERREUR PRÉCISE remonte
// jusqu'à la page admin : indispensable pour diagnostiquer une clé au
// mauvais scope ou un project ID erroné.

const HOST = (process.env.POSTHOG_API_HOST || "https://eu.posthog.com").trim();

export function posthogServerConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PROJECT_ID?.trim() && process.env.POSTHOG_API_KEY?.trim()
  );
}

export type PhResult = { rows: unknown[][] } | { error: string };

export async function phQuery(query: string): Promise<PhResult> {
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const apiKey = process.env.POSTHOG_API_KEY?.trim();
  if (!projectId || !apiKey) return { error: "non configuré" };
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
    const text = await res.text();
    if (!res.ok) {
      // Le détail de l'API (scope manquant, clé invalide, projet inconnu…)
      // vaut mille « ça ne marche pas ».
      let detail = text.slice(0, 300);
      try {
        const j = JSON.parse(text) as { detail?: string; error?: string };
        detail = j.detail || j.error || detail;
      } catch {
        /* texte brut conservé */
      }
      return { error: `HTTP ${res.status} · ${detail}` };
    }
    const json = JSON.parse(text) as { results?: unknown[][] };
    return { rows: json.results ?? [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "requête impossible" };
  }
}
