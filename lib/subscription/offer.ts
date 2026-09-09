// Offre de lancement du plan Pro : 49 € par mois (490 € par an) jusqu'à la
// date ci-dessous, puis le tarif normal ci-dessous. Le coach abonné avant la
// date GARDE 49 € tant qu'il reste abonné.
//
// Cadre légal (pratiques commerciales, DGCCRF) : le prix barré n'est jamais
// présenté comme un « ancien prix » (il n'a pas été pratiqué). C'est le
// TARIF À VENIR, toujours accompagné de sa date d'entrée en vigueur, à côté
// d'un PRIX DE LANCEMENT daté. Le tarif normal entre RÉELLEMENT en vigueur à
// cette date : tout ce qui affiche ou facture le Pro passe par
// currentMonthlyCents() / currentAnnualCents() (jamais un montant en dur).
export const LAUNCH_OFFER = {
  enabled: true,
  // Fin de l'offre (incluse), heure de Paris.
  until: "2026-12-31",
  // Tarif normal annoncé après l'offre, en centimes.
  regularMonthlyCents: 6900,
  regularAnnualCents: 69000,
  // Tarif de lancement (celui réellement facturé par /api/stripe/subscription).
  launchMonthlyCents: 4900,
  launchAnnualCents: 49000,
} as const;

// Fin de l'offre : dernier instant du 31 décembre, heure d'hiver de Paris
// (+01:00). Un décalage d'été (+02:00) ferait expirer l'offre à 22:59.
function offerEnd(): Date {
  return new Date(`${LAUNCH_OFFER.until}T23:59:59+01:00`);
}

export function launchOfferActive(now: Date = new Date()): boolean {
  if (!LAUNCH_OFFER.enabled) return false;
  return now.getTime() <= offerEnd().getTime();
}

// Prix du Pro à cet instant : lancement pendant l'offre, normal ensuite.
// Source unique pour l'affichage ET la facturation Stripe.
export function currentMonthlyCents(now: Date = new Date()): number {
  return launchOfferActive(now)
    ? LAUNCH_OFFER.launchMonthlyCents
    : LAUNCH_OFFER.regularMonthlyCents;
}

export function currentAnnualCents(now: Date = new Date()): number {
  return launchOfferActive(now)
    ? LAUNCH_OFFER.launchAnnualCents
    : LAUNCH_OFFER.regularAnnualCents;
}

// « 49 € », « 490 € », « 40,83 € » selon la langue.
export function euros(cents: number, locale: string = "fr"): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function launchOfferUntilLabel(locale: string): string {
  return new Date(`${LAUNCH_OFFER.until}T12:00:00+01:00`).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

// Premier jour du tarif normal (lendemain de la fin de l'offre), pour
// étiqueter le prix barré : « tarif à partir du 1er janvier 2027 ».
export function launchOfferRegularFromLabel(locale: string): string {
  const d = new Date(`${LAUNCH_OFFER.until}T12:00:00+01:00`);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function launchOfferDaysLeft(now: Date = new Date()): number {
  return Math.max(0, Math.ceil((offerEnd().getTime() - now.getTime()) / 86400000));
}

// Offre du mois : tant que l'offre de lancement court, elle porte un nom qui
// change chaque mois (rentrée, automne, Black Friday, Noël) et un compte à
// rebours jusqu'à la fin du mois en cours. Le prix, lui, est celui de
// LAUNCH_OFFER (49 € jusqu'au 31 décembre, 69 € ensuite) : les textes qui
// l'entourent doivent toujours dire le tarif 2027 et sa date, jamais qu'il
// change le 1er du mois suivant.
const MONTHLY_OFFER_NAMES: Record<number, { fr: string; en: string }> = {
  1: { fr: "Offre de nouvelle année", en: "New year offer" },
  2: { fr: "Offre d'hiver", en: "Winter offer" },
  3: { fr: "Offre de printemps", en: "Spring offer" },
  4: { fr: "Offre de printemps", en: "Spring offer" },
  5: { fr: "Offre de mai", en: "May offer" },
  6: { fr: "Offre d'été", en: "Summer offer" },
  7: { fr: "Offre d'été", en: "Summer offer" },
  8: { fr: "Offre de rentrée", en: "Back-to-school offer" },
  9: { fr: "Offre de rentrée", en: "Back-to-school offer" },
  10: { fr: "Offre d'automne", en: "Autumn offer" },
  11: { fr: "Black Friday", en: "Black Friday" },
  12: { fr: "Offre de Noël", en: "Christmas offer" },
};

export type MonthlyOffer = {
  name: string;
  // Jours restants jusqu'à la fin du mois (1 = dernier jour).
  daysLeft: number;
  // Dernier jour du mois, formaté (« 30 septembre »).
  endsLabel: string;
};

export function monthlyOffer(locale: string = "fr", now: Date = new Date()): MonthlyOffer | null {
  if (!launchOfferActive(now)) return null;
  const month = now.getMonth() + 1;
  const names = MONTHLY_OFFER_NAMES[month];
  // Fin du mois : dernier instant du dernier jour, heure locale du serveur ou
  // du navigateur (précision au jour, l'offre de lancement borne le reste).
  const end = new Date(now.getFullYear(), month, 0, 23, 59, 59, 999);
  const capped = Math.min(end.getTime(), offerEnd().getTime());
  const daysLeft = Math.max(1, Math.ceil((capped - now.getTime()) / 86400000));
  const endsLabel = new Date(capped).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
  });
  return { name: locale === "fr" ? names.fr : names.en, daysLeft, endsLabel };
}
