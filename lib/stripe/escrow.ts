// Répartition de l'argent d'un paiement mis sous séquestre.
//
// Madger encaisse le prix plein sur le compte plateforme (charge séparée), puis,
// à la libération, transfère au coach sa part via un transfert Connect :
//
//   prix = remboursement_client + frais_stripe + commission_madger + versement_coach
//
// - frais_stripe : prélevés par Stripe sur la charge plateforme (montant réel lu
//   sur la balance transaction). Portés par le coach (déduits de son versement).
// - commission_madger : 0 % si le coach est Pro, 5 % du montant conservé sinon.
// - versement_coach : le reste.

const FREE_COMMISSION_RATE = 0.05;

export type PayoutBreakdown = {
  refundCents: number;
  stripeFeeCents: number;
  commissionCents: number;
  payoutCents: number;
};

// Calcule la répartition. `refundCents` = part déjà (ou à) rembourser au client
// (0 si la séance a lieu normalement). `pro` = coach Pro (0 % de commission).
export function computePayout(
  amountCents: number,
  stripeFeeCents: number,
  pro: boolean,
  refundCents = 0
): PayoutBreakdown {
  const refund = Math.min(Math.max(0, refundCents), amountCents);
  const kept = amountCents - refund;
  const commission = pro ? 0 : Math.round(kept * FREE_COMMISSION_RATE);
  // Le coach porte les frais Stripe ; on ne descend jamais sous 0.
  const payout = Math.max(0, kept - stripeFeeCents - commission);
  return {
    refundCents: refund,
    stripeFeeCents,
    commissionCents: commission,
    payoutCents: payout,
  };
}
