// Next.js met en cache les fetch GET des Route Handlers et des fonctions en
// cache (unstable_cache) quand l'URL ne change pas d'un appel à l'autre : la
// lecture des disponibilités d'un coach (même URL PostgREST à chaque fois)
// restait figée en production, et un créneau ajouté n'apparaissait jamais.
// Les clients Supabase créés sans cookies (anon ou service role) passent par
// ce fetch pour lire la base à chaque appel, jamais le cache de données.
export const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export const NO_STORE = { global: { fetch: noStoreFetch } } as const;
