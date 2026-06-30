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
  active: boolean;
};

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
};

// Formate un montant en centimes vers une devise lisible (ex: 5000 → "50 €").
export function formatPrice(
  cents: number,
  currency: string,
  locale: string
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
