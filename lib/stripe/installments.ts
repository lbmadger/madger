// Paiement en 3 fois (Klarna, Alma) : uniquement sur les PACKS, à partir de
// 120 €, et seulement si le coach l'a activé dans ses réglages. Le parcours
// unitaire reste carte, Apple Pay et Google Pay, sans changement.
//
// Frais : contrairement à la carte (supportée par Madger dans les frais de
// transaction « tout compris »), les frais du paiement fractionné restent à la
// charge du coach qui a activé l'option, déduits de son versement.
export const INSTALLMENTS_MIN_CENTS = 12000;

// Grille Stripe France pour Klarna (stripe.com/pricing/local-payment-methods) :
// 4,99 % + 0,45 € par transaction. À réviser si la grille change.
export const INSTALLMENT_FEE_PCT = 4.99;
export const INSTALLMENT_FEE_FIXED_CENTS = 45;

// « 4,99 % + 0,45 € » ; sert au réglage coach et à la charte de paiement.
export function installmentFeeLabel(locale: string = "fr"): string {
  const loc = locale === "en" ? "en-GB" : "fr-FR";
  const pct = (INSTALLMENT_FEE_PCT / 100).toLocaleString(loc, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const fixed = (INSTALLMENT_FEE_FIXED_CENTS / 100).toLocaleString(loc, {
    style: "currency",
    currency: "EUR",
  });
  return `${pct} + ${fixed}`;
}

// Pourcentage effectif arrondi sur un pack au seuil (120 €) : « environ 5 % ».
export function installmentFeeApproxPct(amountCents: number = INSTALLMENTS_MIN_CENTS): number {
  const fee = (amountCents * INSTALLMENT_FEE_PCT) / 100 + INSTALLMENT_FEE_FIXED_CENTS;
  return Math.round((fee / amountCents) * 100);
}

export function installmentsEligible(p: {
  serviceType: string | null | undefined;
  priceCents: number | null | undefined;
  coachEnabled: boolean | null | undefined;
}): boolean {
  return (
    p.serviceType === "pack" &&
    (p.priceCents ?? 0) >= INSTALLMENTS_MIN_CENTS &&
    p.coachEnabled === true
  );
}
