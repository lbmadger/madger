import type { SupabaseClient } from "@supabase/supabase-js";
import { LAUNCH_LINK, launchLinkEligible } from "@/lib/subscription/offer";

// Offre de lancement : Pro mensuel à moitié prix pendant trois mois pour
// tout coach dont le compte a été créé avant la date limite. Rattachée au
// compte par le service role (le coach n'écrit jamais cette colonne), d'après
// la date de création du compte Supabase Auth : un coach inscrit à temps qui
// n'ouvre son dashboard que plus tard garde son droit.
//
// Idempotent : rien si l'offre est déjà posée ou si le coach a déjà eu un
// abonnement. Appelé à la fin de la première étape d'onboarding
// (/api/offer/claim) et à chaque ouverture du dashboard tant que la colonne
// est vide. Renvoie true si l'offre vient d'être posée.
export async function grantLaunchOffer(
  admin: SupabaseClient,
  coachId: string,
  userCreatedAt: string | null | undefined
): Promise<boolean> {
  if (!userCreatedAt || !launchLinkEligible(userCreatedAt)) return false;

  const { data: me } = await admin
    .from("coaches")
    .select("launch_offer, stripe_subscription_id")
    .eq("id", coachId)
    .maybeSingle();
  if (!me || me.launch_offer || me.stripe_subscription_id) return false;

  const { error, data } = await admin
    .from("coaches")
    .update({ launch_offer: LAUNCH_LINK.code, launch_offer_claimed_at: new Date().toISOString() })
    .eq("id", coachId)
    .is("launch_offer", null)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}
