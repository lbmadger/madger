import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

// Comptes de l'équipe (emails admin et adresses @madger.app) : leurs
// abonnements de test ne doivent pas gonfler le MRR ni les compteurs
// d'abonnés du back-office. Lecture des comptes via l'API admin (service
// role), une page suffit largement à cette échelle.
export async function internalCoachIds(admin: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      const email = (u.email ?? "").toLowerCase();
      if (!email) continue;
      if (isAdminEmail(email) || email.endsWith("@madger.app")) ids.add(u.id);
    }
  } catch {
    /* best-effort : sans liste, rien n'est exclu */
  }
  return ids;
}
