import type { SupabaseClient } from "@supabase/supabase-js";

// Essai gratuit du premier abonnement Pro : 7 jours pour tout le monde,
// 30 jours pour les coachs invités personnellement par email au lancement
// (table prospects, adresse professionnelle affichée sur leur site). La
// carte est enregistrée, rien n'est débité pendant l'essai, puis
// renouvellement automatique sauf résiliation (CGV).
export const DEFAULT_TRIAL_DAYS = 7;
export const INVITED_TRIAL_DAYS = 30;

export async function trialDaysFor(
  admin: SupabaseClient | null,
  email: string | null | undefined
): Promise<number> {
  const clean = (email ?? "").trim().toLowerCase();
  if (!admin || !clean) return DEFAULT_TRIAL_DAYS;
  const { data } = await admin
    .from("prospects")
    .select("id")
    .eq("email", clean)
    .is("unsubscribed_at", null)
    .limit(1)
    .maybeSingle();
  return data ? INVITED_TRIAL_DAYS : DEFAULT_TRIAL_DAYS;
}
