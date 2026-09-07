// Politique d'annulation d'un coach : un DÉLAI (12, 24 ou 48 h avant la
// séance, réglé dans Réglages → Politique d'annulation) et DEUX pourcentages
// indépendants.
//  - overPct  : % du prix remboursé au client s'il annule AVANT le délai ;
//  - underPct : % remboursé s'il annule APRÈS (moins de N h avant le début).
// Après le début de la séance (absence), remboursement 0. Si c'est le COACH
// qui annule, le client est toujours remboursé à 100 % (géré côté routes).
// Séances sur pack : le délai est celui du pack ; avant, le crédit est rendu,
// après, il est perdu (lot 2).
//
// Source de vérité côté produit ET juridique (cf. page /charte-paiement).

export type RefundPolicy = {
  overPct: number; // annulation plus de `hours` h avant la séance
  underPct: number; // annulation moins de `hours` h avant la séance
  hours: number; // 12 | 24 | 48
};

export const CANCEL_HOURS_CHOICES = [12, 24, 48] as const;
export const DEFAULT_CANCEL_HOURS = 24;

// Ancien système : formules toutes faites. Conservé uniquement pour convertir
// les lignes qui n'ont pas encore leurs pourcentages (et d'anciens payloads).
export type CancellationPolicy = "flexible" | "moderate" | "strict";
const PRESET_PCTS: Record<CancellationPolicy, Omit<RefundPolicy, "hours">> = {
  flexible: { overPct: 100, underPct: 50 },
  moderate: { overPct: 75, underPct: 0 },
  strict: { overPct: 50, underPct: 0 },
};

export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  ...PRESET_PCTS.moderate,
  hours: DEFAULT_CANCEL_HOURS,
};

// Plan Essentiel : règle FIXE, non modifiable. Remboursement intégral si le
// client annule plus de 24 h avant la séance, rien en deçà (le montant reste
// acquis au coach). La politique paramétrable ci-dessous est réservée à Pro.
export const ESSENTIAL_REFUND_POLICY: RefundPolicy = {
  overPct: 100,
  underPct: 0,
  hours: 24,
};

// Valeurs proposées dans les réglages (sélecteurs).
export const REFUND_PCT_CHOICES = [100, 75, 50, 25, 0] as const;

function clampPct(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function clampCancelHours(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return n === 12 || n === 24 || n === 48 ? n : DEFAULT_CANCEL_HOURS;
}

// Le coach est-il Essentiel (règle fixe) ? Vrai seulement quand la source
// permet de le dire : `pro` (vue publique) ou `pro_until` (ligne coaches).
// Une source muette garde la politique paramétrée (compatibilité).
function isEssential(src: { pro?: unknown; pro_until?: unknown } | null | undefined): boolean {
  if (!src) return false;
  if (typeof src.pro === "boolean") return !src.pro;
  if ("pro_until" in src) {
    const until = src.pro_until;
    if (!until) return true;
    const t = new Date(String(until)).getTime();
    return !(Number.isFinite(t) && t > Date.now());
  }
  return false;
}

// Résout la politique d'un coach à partir de ses colonnes. Coach Essentiel :
// règle fixe. Coach Pro : les deux pourcentages explicites priment ; à
// défaut, l'ancienne formule est convertie ; à défaut, la politique par
// défaut (75 / 0, 24 h).
export function resolveRefundPolicy(
  src:
    | {
        refund_over_24h_pct?: unknown;
        refund_under_24h_pct?: unknown;
        cancellation_policy?: unknown;
        cancel_hours?: unknown;
        pro?: unknown;
        pro_until?: unknown;
      }
    | null
    | undefined
): RefundPolicy {
  if (isEssential(src)) return { ...ESSENTIAL_REFUND_POLICY };
  const hours = clampCancelHours(src?.cancel_hours);
  const over = clampPct(src?.refund_over_24h_pct);
  const under = clampPct(src?.refund_under_24h_pct);
  if (over !== null && under !== null) {
    return { overPct: over, underPct: under, hours };
  }
  const preset = src?.cancellation_policy;
  if (preset === "flexible" || preset === "moderate" || preset === "strict") {
    return { ...PRESET_PCTS[preset], hours };
  }
  return { ...DEFAULT_REFUND_POLICY, hours };
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
  const pct =
    hoursBefore >= (policy.hours || DEFAULT_CANCEL_HOURS)
      ? policy.overPct
      : policy.underPct;
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

// Séance sur pack : le crédit est-il rendu si le client annule `now` ?
// Vrai tant qu'on est à plus de `hours` h du début.
export function creditRestoredIfCancelled(
  hours: number,
  startsAt: Date,
  now: Date = new Date()
): boolean {
  const hoursBefore = (startsAt.getTime() - now.getTime()) / 3_600_000;
  return hoursBefore >= clampCancelHours(hours);
}

// Paliers exposables à l'UI (profil coach, modale de réservation, réglages).
// Triés du plus lointain au plus proche, même contrat qu'avant.
export function policyTiers(
  policy: RefundPolicy
): { minHoursBefore: number; refund: number }[] {
  const h = policy.hours || DEFAULT_CANCEL_HOURS;
  return [
    { minHoursBefore: h, refund: policy.overPct / 100 },
    { minHoursBefore: 0, refund: policy.underPct / 100 },
  ];
}
