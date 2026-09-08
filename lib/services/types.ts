export type ServiceType = "single" | "pack" | "subscription";
export type ServiceLocation = "in_person" | "online";

export type Service = {
  id: string;
  coach_id: string;
  created_at: string;
  name: string;
  description: string | null;
  type: ServiceType;
  location: ServiceLocation;
  duration_min: number | null;
  price_cents: number;
  currency: string;
  pack_size: number | null;
  // Packs : validité en jours (null = sans limite) et délai d'annulation
  // gratuite (12 / 24 / 48 h) avant la séance.
  validity_days?: number | null;
  cancel_hours?: number | null;
  // Places (migration 0068) : 1 = individuelle, 2 à 50 = collective, prix
  // par personne. Un pack collectif référence sa prestation collective.
  capacity?: number | null;
  group_service_id?: string | null;
  // Packs : séances par semaine au plus (null = sans limite), figé à l'achat.
  max_per_week?: number | null;
  active: boolean;
};

export function isGroupService(s: { capacity?: number | null }): boolean {
  return (s.capacity ?? 1) > 1;
}

// Version publique (vue public_services) : sans created_at / active.
export type PublicService = {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  type: ServiceType;
  location: ServiceLocation;
  duration_min: number | null;
  price_cents: number;
  currency: string;
  pack_size: number | null;
  validity_days?: number | null;
  cancel_hours?: number | null;
  capacity?: number | null;
  group_service_id?: string | null;
};

// Formate un montant en centimes vers une devise lisible (ex: 5000 → "50 €").
export function formatPrice(
  cents: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
