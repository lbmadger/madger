// Numéro de facture HISTORIQUE (paiements antérieurs à la migration 0056),
// dérivé du paiement : F-<année>-<6 premiers caractères de l'id>. Stable.
// Les nouveaux paiements reçoivent un numéro séquentiel sans trou
// (F-AAAA-0001) stocké dans la table invoices : voir displayInvoiceNumber.
export function invoiceNumber(paymentId: string, paidAt: string): string {
  const y = new Date(paidAt).getFullYear();
  return `F-${y}-${paymentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// Ligne(s) `invoices` embarquée(s) par PostgREST sur un paiement.
export type InvoiceRow = {
  id?: string;
  number: string | null;
  kind?: string | null;
  amount_cents?: number | null;
  issued_at?: string | null;
};

// Numéro affiché : le séquentiel s'il existe, sinon l'ancien format haché
// (les paiements de test antérieurs gardent leur numéro, jamais renumérotés).
export function displayInvoiceNumber(
  invoices: InvoiceRow | InvoiceRow[] | null | undefined,
  paymentId: string,
  paidAt: string
): string {
  const rows = Array.isArray(invoices) ? invoices : invoices ? [invoices] : [];
  const inv = rows.find((r) => (r.kind ?? "invoice") === "invoice" && r.number);
  return inv?.number ?? invoiceNumber(paymentId, paidAt);
}

// Avoirs rattachés à un paiement (kind = credit_note), les plus récents en tête.
export function creditNotesOf(
  invoices: InvoiceRow | InvoiceRow[] | null | undefined
): InvoiceRow[] {
  const rows = Array.isArray(invoices) ? invoices : invoices ? [invoices] : [];
  return rows
    .filter((r) => r.kind === "credit_note" && r.number)
    .sort((a, b) => (b.issued_at ?? "").localeCompare(a.issued_at ?? ""));
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
