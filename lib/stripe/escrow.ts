// Répartition de l'argent d'un paiement mis sous séquestre.
//
// Madger encaisse le prix plein sur le compte plateforme (charge séparée), puis,
// à la libération, transfère au coach sa part via un transfert Connect :
//
//   prix = remboursement_client + frais_madger + frais_3x (le cas échéant) + versement_coach
//
// - frais_madger : taux du plan FIGÉ sur la transaction (payments.fee_rate_bps :
//   7 % Essentiel, 3 % Pro, 0 Studio), appliqué au montant conservé.
//   « Tout compris » : les frais Stripe carte sont supportés par Madger, ils
//   ne sont PAS déduits du coach (ils restent enregistrés dans
//   payments.stripe_fee_cents pour la comptabilité interne et la marge).
// - frais_3x : paiement fractionné (Klarna, Alma) activé par le coach : les
//   frais du prestataire, lus sur la balance transaction, sont à sa charge.
// - versement_coach : le reste.

export type PayoutBreakdown = {
  refundCents: number;
  // Frais Stripe réels (information interne, jamais déduits du coach hors
  // paiement fractionné).
  stripeFeeCents: number;
  // Frais de transaction Madger (colonne payments.commission_cents).
  commissionCents: number;
  // Frais du paiement fractionné à la charge du coach (0 hors Klarna/Alma).
  providerFeeCents: number;
  payoutCents: number;
};

export type PayoutInput = {
  amountCents: number;
  // Taux Madger en points de base, figé sur la transaction.
  feeRateBps: number;
  // Frais Stripe réels de la charge (balance transaction).
  stripeFeeCents: number;
  // Paiement fractionné : les frais Stripe de cette charge incombent au coach.
  coachBearsStripeFee?: boolean;
  // Part déjà (ou à) rembourser au client (0 si la séance a lieu normalement).
  refundCents?: number;
};

export function computePayout(input: PayoutInput): PayoutBreakdown {
  const amount = Math.max(0, input.amountCents);
  const refund = Math.min(Math.max(0, input.refundCents ?? 0), amount);
  const kept = amount - refund;
  const commission = Math.round((kept * Math.max(0, input.feeRateBps)) / 10000);
  const stripeFee = Math.max(0, input.stripeFeeCents);
  // Paiement fractionné : les frais du prestataire suivent le montant
  // conservé (un remboursement partiel Stripe rend la part de frais
  // correspondante) ; on ne descend jamais sous 0.
  const providerFee = input.coachBearsStripeFee
    ? Math.min(kept, amount > 0 ? Math.round((stripeFee * kept) / amount) : 0)
    : 0;
  const payout = Math.max(0, kept - commission - providerFee);
  return {
    refundCents: refund,
    stripeFeeCents: stripeFee,
    commissionCents: commission,
    providerFeeCents: providerFee,
    payoutCents: payout,
  };
}

// Moyens de paiement dont les frais restent à la charge du coach (paiement en
// 3 fois, activé explicitement dans ses réglages).
export const COACH_BORNE_METHODS = ["klarna", "alma"] as const;

export function coachBearsStripeFee(paymentMethod: string | null | undefined): boolean {
  return (COACH_BORNE_METHODS as readonly string[]).includes(paymentMethod ?? "");
}
