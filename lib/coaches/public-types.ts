// Coach tel qu'exposé publiquement (vue public_coaches) : uniquement des
// champs non sensibles, et seulement les coachs `listed`.
export type PublicCoach = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  specialty: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  accepts_online: boolean;
  lat: number | null;
  lng: number | null;
  stripe_charges_enabled: boolean;
  cancellation_policy: "flexible" | "moderate" | "strict";
  booking_mode: "instant" | "approval";
  created_at: string;
  // Avis (vue public_coaches, migration 0020)
  rating_avg: number | null;
  rating_count: number;
  // Filtres (migration 0021)
  sport: string | null;
  specialties: string[];
  venues: string[];
  gym_name: string | null;
};

// Avis public (vue public_reviews) : prénom du client uniquement.
export type PublicReview = {
  id: string;
  coach_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_first_name: string;
};

export function coachFullName(c: {
  first_name: string;
  last_name: string | null;
}): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export function coachInitials(c: {
  first_name: string;
  last_name: string | null;
}): string {
  return (
    (c.first_name.charAt(0) + (c.last_name?.charAt(0) ?? "")).toUpperCase() ||
    "?"
  );
}
