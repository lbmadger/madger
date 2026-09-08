// TVA sur les factures des coachs. Les prix Madger sont TTC : c'est ce que
// paie le client. Un coach assujetti (numéro de TVA + taux dans ses réglages)
// voit sa facture ventilée HT / TVA / TTC ; un coach en franchise en base
// (taux 0, cas de la micro-entreprise) garde la mention « TVA non applicable,
// art. 293 B du CGI ».

// Taux proposés, en points de base (1 % = 100 bps).
export const VAT_RATE_CHOICES_BPS = [0, 550, 1000, 2000] as const;
export type VatRateBps = (typeof VAT_RATE_CHOICES_BPS)[number];

export function clampVatRateBps(v: unknown): VatRateBps {
  const n = typeof v === "number" ? v : Number(v);
  return (VAT_RATE_CHOICES_BPS as readonly number[]).includes(n) ? (n as VatRateBps) : 0;
}

// La TVA s'applique seulement si le coach a un numéro ET un taux non nul :
// un numéro seul (coach qui l'a saisi par précaution) ne change rien.
export function vatApplies(vatNumber: string | null | undefined, rateBps: number | null | undefined): boolean {
  return Boolean(vatNumber && vatNumber.trim()) && clampVatRateBps(rateBps) > 0;
}

// Ventilation d'un montant TTC (centimes) : HT arrondi au centime, TVA = le
// reste, de sorte que HT + TVA = TTC exactement (jamais un centime d'écart).
export function splitVat(ttcCents: number, rateBps: number): { htCents: number; vatCents: number } {
  const rate = clampVatRateBps(rateBps);
  const ttc = Math.round(ttcCents);
  if (rate === 0) return { htCents: ttc, vatCents: 0 };
  const ht = Math.round((ttc * 10000) / (10000 + rate));
  return { htCents: ht, vatCents: ttc - ht };
}

// « 20 % », « 5,5 % ».
export function vatRateLabel(rateBps: number, locale: string = "fr"): string {
  return (clampVatRateBps(rateBps) / 10000).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
  });
}
