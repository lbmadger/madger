// Offre de lancement du plan Pro : 49 € par mois (490 € par an) jusqu'à la
// date ci-dessous, puis le tarif normal ci-dessous. Le coach abonné avant la
// date GARDE 49 € tant qu'il reste abonné.
//
// Cadre légal (pratiques commerciales, DGCCRF) : on n'affiche jamais un
// « ancien prix » barré qui n'a jamais été pratiqué. On annonce un PRIX DE
// LANCEMENT avec sa date de fin et le tarif qui s'appliquera ensuite. Le
// tarif normal doit donc réellement entrer en vigueur à cette date (ou
// l'offre doit être prolongée en changeant `until`).
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

export function launchOfferDaysLeft(now: Date = new Date()): number {
  const end = new Date(`${LAUNCH_OFFER.until}T23:59:59+02:00`);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}
