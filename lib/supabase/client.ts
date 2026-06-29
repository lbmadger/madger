import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur (composants client du dashboard).
// Utilise la clé anon publique : les accès sont bornés par les politiques
// RLS définies en base, jamais par la service role (réservée au serveur).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
