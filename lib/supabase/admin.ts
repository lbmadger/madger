import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Client Supabase service role (bypass RLS). Réservé aux routes/pages serveur
// déjà protégées (admin, webhooks, cron). Renvoie null si la clé est absente.
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key);
}
