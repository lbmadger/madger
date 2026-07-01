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
  // Abonnement (migration 0010) — Pro tant que pro_until est dans le futur
  pro_until: string | null;
};

// Récupère le profil coach de l'utilisateur connecté. Renvoie:
// - { coach } si trouvé,
// - { coach: null } si pas de session,
// - { coach: null, missingTable: true } si la table n'existe pas encore
//   (SQL pas encore exécuté) — permet au layout de ne pas planter.
export async function getCoach(): Promise<{
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

  return { coach: data as Coach | null };
}
