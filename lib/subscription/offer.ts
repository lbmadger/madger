// Prix du plan Pro : 49 € par mois, 490 € par an (deux mois offerts). Un seul
// tarif, sans date de fin. Tout ce qui affiche ou facture le Pro passe par
// currentMonthlyCents() / currentAnnualCents(), jamais un montant en dur.
export const PRO_PRICE = {
  monthlyCents: 4900,
  annualCents: 49000,
} as const;

export function currentMonthlyCents(): number {
  return PRO_PRICE.monthlyCents;
}

export function currentAnnualCents(): number {
  return PRO_PRICE.annualCents;
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

// ── Offre de lancement ──────────────────────────────────────────────────────
// Tout coach dont le compte est créé avant le 11 octobre 2026 (heure de
// Paris) obtient Pro mensuel à moitié prix pendant trois mois, au moment de
// son premier abonnement. L'offre est rattachée au compte par le serveur
// (lib/subscription/launchOffer.ts) d'après la date de création du compte,
// sans code ni lien particulier, et appliquée par un coupon Stripe dans
// /api/stripe/subscription. Le prix affiché vient d'ici, jamais en dur.
export const LAUNCH_LINK = {
  code: "LANCEMENT",
  percentOff: 50,
  months: 3,
  // Dernier jour (inclus, heure de Paris) pour créer son compte.
  claimUntil: "2026-10-10",
  // Identifiant du coupon Stripe, créé à la volée s'il n'existe pas.
  stripeCouponId: "LANCEMENT50",
} as const;

// Fin de l'offre : dernier instant du 10 octobre, heure d'été de Paris
// (+02:00). Le changement d'heure n'a lieu que le 25 octobre.
export function launchLinkEnd(): Date {
  return new Date(`${LAUNCH_LINK.claimUntil}T23:59:59+02:00`);
}

// Vrai tant qu'on peut encore créer un compte éligible.
export function launchLinkActive(now: Date = new Date()): boolean {
  return now.getTime() <= launchLinkEnd().getTime();
}

// Vrai si un compte créé à cet instant a droit à l'offre.
export function launchLinkEligible(createdAt: Date | string): boolean {
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && t <= launchLinkEnd().getTime();
}

// Mensuel remisé pendant les premiers mois : 24,50 € sur 49 €.
export function launchLinkMonthlyCents(): number {
  return Math.round((currentMonthlyCents() * (100 - LAUNCH_LINK.percentOff)) / 100);
}

// « 10 octobre » : dernier jour pour créer son compte.
export function launchLinkUntilLabel(locale: string): string {
  return new Date(`${LAUNCH_LINK.claimUntil}T12:00:00+02:00`).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-GB",
    { day: "numeric", month: "long" }
  );
}

// « 11 octobre » : premier jour sans l'offre (pour « avant le 11 octobre »).
export function launchLinkDeadlineLabel(locale: string): string {
  const d = new Date(`${LAUNCH_LINK.claimUntil}T12:00:00+02:00`);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
  });
}
