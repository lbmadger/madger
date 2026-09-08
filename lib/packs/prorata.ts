// Prorata d'un pack de séances : ce qui se rembourse ou se libère se calcule
// sur les séances PAYÉES (pack_credits.paid_total, figé à l'achat), jamais
// sur les séances offertes par le coach (qui n'augmentent que `total`). On
// considère que les séances offertes sont consommées en dernier : elles
// n'entrent dans aucun montant.

// Nombre de séances payées non consommées. `includeCurrent` compte la
// séance en cours d'annulation comme non consommée.
export function packRefundableUnits(
  total: number,
  used: number,
  paidTotal: number | null | undefined,
  includeCurrent: boolean
): number {
  const paid = paidTotal && paidTotal > 0 ? paidTotal : total;
  const free = Math.max(0, total - paid);
  const remaining = Math.max(0, total - used + (includeCurrent ? 1 : 0));
  return Math.max(0, Math.min(paid, remaining - free));
}

// Nombre de séances payées d'un pack (repli sur le total).
export function packPaidTotal(
  total: number,
  paidTotal: number | null | undefined
): number {
  return paidTotal && paidTotal > 0 ? paidTotal : total;
}

// Part du montant payé correspondant à `units` séances payées.
export function packProrata(
  amountCents: number,
  units: number,
  paidTotal: number
): number {
  if (paidTotal <= 0) return 0;
  return Math.round((amountCents * Math.min(units, paidTotal)) / paidTotal);
}
