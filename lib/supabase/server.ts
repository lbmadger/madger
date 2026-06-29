import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase côté serveur (Server Components, Route Handlers, Server
// Actions du dashboard). La session du coach vit dans des cookies httpOnly,
// lus/écrits ici. Distinct du client service-role de la landing : ici on
// passe par l'auth utilisateur, donc les politiques RLS s'appliquent.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Dans un Server Component pur, l'écriture de cookies lève une
          // erreur : on l'ignore. Le rafraîchissement de session est alors
          // assuré par le middleware (Phase 1).
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // no-op : appelé depuis un Server Component sans réponse mutable.
          }
        },
      },
    }
  );
}
