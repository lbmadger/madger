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
