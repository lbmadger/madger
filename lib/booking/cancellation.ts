// Politique d'annulation d'un coach : DEUX pourcentages indépendants, réglés
// dans Réglages → Politique d'annulation.
//  - overPct  : % du prix remboursé au client s'il annule PLUS de 24 h avant
//    le début de la séance ;
//  - underPct : % remboursé s'il annule MOINS de 24 h avant le début.
// Après le début de la séance (absence), remboursement 0. Si c'est le COACH
// qui annule, le client est toujours remboursé à 100 % (géré côté routes).
//
// Source de vérité côté produit ET juridique (cf. page /charte-paiement).

export type RefundPolicy = {
  overPct: number; // annulation plus de 24 h avant la séance
  underPct: number; // annulation moins de 24 h avant la séance
};

// Ancien système : formules toutes faites. Conservé uniquement pour convertir
// les lignes qui n'ont pas encore leurs pourcentages (et d'anciens payloads).
export type CancellationPolicy = "flexible" | "moderate" | "strict";
const PRESET_PCTS: Record<CancellationPolicy, RefundPolicy> = {
  flexible: { overPct: 100, underPct: 50 },
  moderate: { overPct: 75, underPct: 0 },
  strict: { overPct: 50, underPct: 0 },
};

export const DEFAULT_REFUND_POLICY: RefundPolicy = PRESET_PCTS.moderate;

// Valeurs proposées dans les réglages (sélecteurs).
export const REFUND_PCT_CHOICES = [100, 75, 50, 25, 0] as const;

function clampPct(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Résout la politique d'un coach à partir de ses colonnes : les deux
// pourcentages explicites priment ; à défaut, l'ancienne formule est
// convertie ; à défaut, la politique par défaut (75 / 0).
export function resolveRefundPolicy(
  src:
    | {
        refund_over_24h_pct?: unknown;
        refund_under_24h_pct?: unknown;
        cancellation_policy?: unknown;
      }
    | null
    | undefined
): RefundPolicy {
  const over = clampPct(src?.refund_over_24h_pct);
  const under = clampPct(src?.refund_under_24h_pct);
  if (over !== null && under !== null) return { overPct: over, underPct: under };
  const preset = src?.cancellation_policy;
  if (preset === "flexible" || preset === "moderate" || preset === "strict") {
    return PRESET_PCTS[preset];
  }
  return DEFAULT_REFUND_POLICY;
}

// Fraction remboursée au client (0 → 1) pour une annulation `now` d'une séance
// qui démarre à `startsAt`. Après le début (no-show), on rembourse 0.
export function refundFraction(
  policy: RefundPolicy,
  startsAt: Date,
  now: Date = new Date()
): number {
  const hoursBefore = (startsAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursBefore <= 0) return 0; // séance passée / no-show
  const pct = hoursBefore >= 24 ? policy.overPct : policy.underPct;
  return Math.min(100, Math.max(0, pct)) / 100;
}

// Montant remboursé (en centimes) pour une annulation donnée.
export function refundCents(
  policy: RefundPolicy,
  startsAt: Date,
  amountCents: number,
  now: Date = new Date()
): number {
  return Math.round(amountCents * refundFraction(policy, startsAt, now));
}

// Paliers exposables à l'UI (profil coach, modale de réservation, réglages).
// Triés du plus lointain au plus proche, même contrat qu'avant.
export function policyTiers(
  policy: RefundPolicy
): { minHoursBefore: number; refund: number }[] {
  return [
    { minHoursBefore: 24, refund: policy.overPct / 100 },
    { minHoursBefore: 0, refund: policy.underPct / 100 },
  ];
}
