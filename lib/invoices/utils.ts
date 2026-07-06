// Numéro de facture déterministe, dérivé du paiement : F-<année>-<6 premiers
// caractères de l'id>. Stable (re-générer la page redonne le même numéro).
export function invoiceNumber(paymentId: string, paidAt: string): string {
  const y = new Date(paidAt).getFullYear();
  return `F-${y}-${paymentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// Numéro de la facture de commission Madger → coach : MC-<AAAA-MM>-<6 premiers
// caractères de l'id coach>. Déterministe : un coach + un mois = un numéro.
export function madgerInvoiceNumber(coachId: string, period: string): string {
  return `MC-${period}-${coachId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// Mois (AAAA-MM) auquel rattacher une commission : date de versement au coach
// en priorité, sinon date de résolution du litige, sinon date d'encaissement.
export function commissionPeriod(p: {
  released_at: string | null;
  resolved_at: string | null;
  paid_at: string | null;
}): string | null {
  const ts = p.released_at ?? p.resolved_at ?? p.paid_at;
  if (!ts) return null;
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
