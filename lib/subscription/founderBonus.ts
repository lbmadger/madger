import type { SupabaseClient } from "@supabase/supabase-js";
import { LAUNCH_AT } from "@/lib/launch";

// Même plafond que le formulaire d'accès anticipé : au-delà, l'inscrit
// était sur liste d'attente (son email le lui disait) et n'a rien été promis.
const FOUNDER_CAP = Number(process.env.FOUNDER_CAP ?? 50);
const FOUNDER_BONUS_MONTHS = 1;

// Promesse faite aux membres fondateurs (landing, CGV, email d'accès
// anticipé) : « Plan Pro offert 1 mois dès le lancement ». Posée une seule
// fois par coach (founder_bonus_granted_at), sur pro_bonus_until (accès
// offert, aucun débit), cumulée à un éventuel mois déjà offert. Réservée aux
// inscrits d'avant l'ouverture. Idempotente : appelée à la fin de l'étape 1
// de l'onboarding (/api/offer/claim) ET à chaque ouverture du dashboard tant
// que le marqueur est vide, pour qu'un appel perdu ne prive pas le coach.
export async function grantFounderBonus(
  admin: SupabaseClient,
  coachId: string,
  email?: string | null
): Promise<boolean> {
  let clean = (email ?? "").trim().toLowerCase();
  if (!clean) {
    const { data } = await admin.auth.admin.getUserById(coachId);
    clean = (data?.user?.email ?? "").trim().toLowerCase();
  }
  if (!clean) return false;
  const { data: row } = await admin
    .from("early_access")
    .select("created_at")
    .eq("email", clean)
    .lt("created_at", LAUNCH_AT)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!row?.created_at) return false;
  const { count: before } = await admin
    .from("early_access")
    .select("id", { count: "exact", head: true })
    .lt("created_at", row.created_at as string);
  if ((before ?? 0) >= FOUNDER_CAP) return false;
  const { data: me } = await admin
    .from("coaches")
    .select("pro_bonus_until, founder_bonus_granted_at")
    .eq("id", coachId)
    .maybeSingle();
  if (!me || me.founder_bonus_granted_at) return false;
  const base = Math.max(
    Date.now(),
    me.pro_bonus_until ? new Date(me.pro_bonus_until as string).getTime() : 0
  );
  const until = new Date(base);
  until.setUTCMonth(until.getUTCMonth() + FOUNDER_BONUS_MONTHS);
  const { data: done } = await admin
    .from("coaches")
    .update({
      pro_bonus_until: until.toISOString(),
      founder_bonus_granted_at: new Date().toISOString(),
    })
    .eq("id", coachId)
    .is("founder_bonus_granted_at", null)
    .select("id");
  return Boolean(done?.length);
}
