// Leia, la conseillère Madger : analyse le profil et l'activité du coach et
// renvoie des conseils personnalisés, classés par impact (compléter le profil
// d'abord, puis les leviers de croissance). Les textes vivent dans les
// dictionnaires i18n sous leia.tips.<id> ; ici on ne décide que QUELS conseils
// s'appliquent et vers quelle page ils renvoient.

export type LeiaInput = {
  hasPhoto: boolean;
  bioLength: number;
  hasCity: boolean;
  hasSport: boolean;
  servicesCount: number;
  hasPack: boolean;
  availabilityCount: number;
  bookingMode: "instant" | "approval";
  reviewsCount: number;
  ratingAvg: number;
  bookings30d: number;
  isPro: boolean;
  paidCount: number;
};

export type LeiaTip = {
  id: string;
  // Page où agir ; absent → conseil sans bouton (ex : demander des avis).
  href?: string;
};

export function computeLeiaTips(i: LeiaInput): LeiaTip[] {
  const tips: LeiaTip[] = [];

  // ── Profil incomplet : le plus urgent, ça bloque les réservations ──────────
  if (i.servicesCount === 0) {
    tips.push({ id: "services", href: "/dashboard/prestations" });
  }
  if (i.availabilityCount === 0) {
    tips.push({ id: "availability", href: "/dashboard/disponibilites" });
  }
  if (!i.hasPhoto) {
    tips.push({ id: "photo", href: "/dashboard/reglages" });
  }
  if (i.bioLength < 80) {
    tips.push({ id: "bio", href: "/dashboard/reglages" });
  }
  if (!i.hasCity || !i.hasSport) {
    tips.push({ id: "activity", href: "/dashboard/reglages" });
  }

  // ── Leviers de croissance ──────────────────────────────────────────────────
  if (
    i.bookings30d === 0 &&
    i.servicesCount > 0 &&
    i.availabilityCount > 0
  ) {
    tips.push({ id: "share" });
  }
  if (i.bookingMode === "approval") {
    tips.push({ id: "instant", href: "/dashboard/reglages" });
  }
  if (i.servicesCount > 0 && !i.hasPack) {
    tips.push({ id: "pack", href: "/dashboard/prestations" });
  }
  if (i.reviewsCount < 5) {
    tips.push({ id: "reviews" });
  } else if (i.ratingAvg > 0 && i.ratingAvg < 4.8) {
    tips.push({ id: "quality" });
  }
  if (!i.isPro && i.paidCount >= 3) {
    tips.push({ id: "pro", href: "/dashboard/abonnement" });
  }

  return tips;
}

// Conseil du jour : 10 conseils généraux qui tournent selon le jour de
// l'année (même conseil pour tout le monde un jour donné).
export const LEIA_DAILY_COUNT = 10;

export function dailyTipIndex(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  return ((day % LEIA_DAILY_COUNT) + LEIA_DAILY_COUNT) % LEIA_DAILY_COUNT;
}
