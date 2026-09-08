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
  // Politique d'annulation personnalisée (migration 0038) : % remboursé si
  // le client annule plus / moins de 24 h avant la séance.
  refund_over_24h_pct: number | null;
  refund_under_24h_pct: number | null;
  // Délai de bascule 12 / 24 / 48 h (migration 0058), absent = 24.
  cancel_hours?: number | null;
  // Paiement en 3x (Klarna) sur les packs dès 120 € (migration 0060).
  installments_enabled?: boolean | null;
  // Plan Pro actif (migration 0065) : politique d'annulation paramétrable.
  // Absent ou faux : règle fixe Essentiel.
  pro?: boolean | null;
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
  // Prix d'appel « à partir de » (min des prestations actives, migration 0042).
  from_price_cents: number | null;
  // Diplôme vérifié par l'équipe Madger (migration 0044).
  verified: boolean;
};

// Cours collectif à venir (vue public_group_sessions, migration 0068) :
// places prises calculées en base.
export type PublicGroupSession = {
  id: string;
  coach_id: string;
  service_id: string | null;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  currency: string;
  location: "in_person" | "online";
  location_text: string | null;
  seats_taken: number;
};

// Photo de la galerie Résultats (table coach_photos, migrations 0047/0048).
// url_after remplie = paire avant/après affichée côte à côte.
export type CoachPhoto = {
  id: string;
  url: string;
  url_after: string | null;
  caption: string | null;
};

// Avis public (vue public_reviews) : prénom du client uniquement.
export type PublicReview = {
  id: string;
  coach_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_first_name: string;
  // Réponse publique du coach (migration 0053), affichée sous l'avis.
  reply: string | null;
  replied_at: string | null;
};

export function coachFullName(c: {
  first_name: string;
  last_name: string | null;
}): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

// Badge « Super coach » : gagné par les avis, pas acheté. Seuil volontairement
// exigeant : au moins 10 avis ET une moyenne ≥ 4,8/5.
export function isSuperCoach(c: {
  rating_avg: number | null;
  rating_count: number;
}): boolean {
  return c.rating_count >= 10 && Number(c.rating_avg ?? 0) >= 4.8;
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
