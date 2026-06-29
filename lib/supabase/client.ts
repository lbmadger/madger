import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Client Supabase côté navigateur (composants client du dashboard).
// Utilise la clé anon publique : les accès sont bornés par les politiques
// RLS définies en base, jamais par la service role (réservée au serveur).
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
