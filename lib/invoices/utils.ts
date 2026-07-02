// Numéro de facture déterministe, dérivé du paiement : F-<année>-<6 premiers
// caractères de l'id>. Stable (re-générer la page redonne le même numéro).
export function invoiceNumber(paymentId: string, paidAt: string): string {
  const y = new Date(paidAt).getFullYear();
  return `F-${y}-${paymentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
