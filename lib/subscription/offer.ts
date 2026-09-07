// Offre de lancement du plan Pro : 49 € par mois (490 € par an) jusqu'à la
// date ci-dessous, puis le tarif normal ci-dessous. Le coach abonné avant la
// date GARDE 49 € tant qu'il reste abonné.
//
// Cadre légal (pratiques commerciales, DGCCRF) : le prix barré n'est jamais
// présenté comme un « ancien prix » (il n'a pas été pratiqué). C'est le
// TARIF À VENIR, toujours accompagné de sa date d'entrée en vigueur, à côté
// d'un PRIX DE LANCEMENT daté. Le tarif normal doit donc réellement entrer
// en vigueur à cette date (ou l'offre doit être prolongée via `until`).
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

export function launchOfferActive(now: Date = new Date()): boolean {
  if (!LAUNCH_OFFER.enabled) return false;
  const end = new Date(`${LAUNCH_OFFER.until}T23:59:59+02:00`);
  return now.getTime() <= end.getTime();
}

export function launchOfferUntilLabel(locale: string): string {
  return new Date(`${LAUNCH_OFFER.until}T12:00:00+02:00`).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

// Premier jour du tarif normal (lendemain de la fin de l'offre), pour
// étiqueter le prix barré : « tarif à partir du 1er janvier 2027 ».
export function launchOfferRegularFromLabel(locale: string): string {
  const d = new Date(`${LAUNCH_OFFER.until}T12:00:00+02:00`);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function launchOfferDaysLeft(now: Date = new Date()): number {
  const end = new Date(`${LAUNCH_OFFER.until}T23:59:59+02:00`);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}
