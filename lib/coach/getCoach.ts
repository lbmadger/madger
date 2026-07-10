import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Profil coach tel que stocké en base. Hand-écrit pour l'instant (on génèrera
// les types Supabase plus tard si besoin).
export type Coach = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
  specialty: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  onboarding_completed: boolean;
  // Champs marketplace (migration 0002)
  city: string | null;
  accepts_online: boolean;
  listed: boolean;
  // Géolocalisation (migration 0009)
  lat: number | null;
  lng: number | null;
  // Abonnement (migration 0010) — Pro tant que pro_until est dans le futur.
  // NB : getCoach renvoie ici le pro_until EFFECTIF, c.-à-d. max(pro_until réel,
  // pro_bonus_until). Tous les appels isPro(coach.pro_until) restent donc justes.
  pro_until: string | null;
  // Accès Pro offert (parrainage / gestes co.), indépendant de Stripe (0043).
  pro_bonus_until: string | null;
  referral_code: string | null;
  referred_by: string | null;
  // Abonnement Pro Stripe (migration 0015) — le coach paie Madger
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  // Politique d'annulation (migration 0016) : flexible | moderate | strict.
  // Remplacée par les deux pourcentages ci-dessous (migration 0038), gardée
  // en lecture pour convertir les anciens comptes.
  cancellation_policy: "flexible" | "moderate" | "strict";
  // % remboursé si le client annule plus / moins de 24 h avant la séance.
  refund_over_24h_pct: number | null;
  refund_under_24h_pct: number | null;
  // Mode de réservation (migration 0018) : instant | approval
  booking_mode: "instant" | "approval";
  // Filtres marketplace (migration 0021)
  sport: string | null;
  specialties: string[];
  venues: string[];
  gym_name: string | null;
  // Salle VALIDÉE via la recherche OpenStreetMap (migration 0039).
  gym_place_id: string | null;
  gym_address: string | null;
  gym_lat: number | null;
  gym_lng: number | null;
  // Google Calendar + Meet (migration 0027)
  google_refresh_token: string | null;
  google_connected_at: string | null;
  // Délai minimum de réservation en heures (migration 0029)
  min_notice_hours: number;
  // Mentions légales de facturation (migration 0034)
  business_name: string | null;
  siret: string | null;
  vat_number: string | null;
  billing_address: string | null;
  // Coach vérifié (migration 0044) : dépôt de diplôme + validation équipe.
  verification_status: "none" | "pending" | "verified" | "rejected";
  verification_doc_path: string | null;
  verification_note: string | null;
};

// Récupère le profil coach de l'utilisateur connecté. Renvoie:
// - { coach } si trouvé,
// - { coach: null } si pas de session,
// - { coach: null, missingTable: true } si la table n'existe pas encore
//   (SQL pas encore exécuté) — permet au layout de ne pas planter.
// Mémoïsé par requête (React cache) : layout + page partagent le même appel.
export const getCoach = cache(async function getCoachInner(): Promise<{
  coach: Coach | null;
  missingTable?: boolean;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { coach: null };

  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // 42P01 = relation inexistante : la migration n'a pas encore été lancée.
    if (error.code === "42P01") return { coach: null, missingTable: true };
    return { coach: null };
  }

  // Pro effectif = max(pro_until réel, accès offert). On surcharge pro_until
  // pour que tous les consommateurs (isPro, dashboard, commission…) prennent
  // en compte le bonus de parrainage sans changer leur code.
  const coach = data as Coach | null;
  if (coach) {
    const real = coach.pro_until ? new Date(coach.pro_until).getTime() : 0;
    const bonus = coach.pro_bonus_until
      ? new Date(coach.pro_bonus_until).getTime()
      : 0;
    if (bonus > real) coach.pro_until = coach.pro_bonus_until;
  }
  return { coach };
});
