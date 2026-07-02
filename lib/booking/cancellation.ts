// Politiques d'annulation. Chaque coach en choisit une. Une politique définit,
// selon le délai entre l'annulation et le début de la séance, la fraction du
// prix REMBOURSÉE au client (le reste revient au coach, moins frais/commission).
//
// Source de vérité côté produit ET juridique (cf. page /charte-paiement).

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export const DEFAULT_POLICY: CancellationPolicy = "moderate";

// Un palier : "à partir de X heures avant la séance, on rembourse `refund`".
// Les paliers sont triés du plus lointain au plus proche.
type Tier = { minHoursBefore: number; refund: number };

type PolicyDef = {
  id: CancellationPolicy;
  tiers: Tier[];
};

// ⚠️ Les pourcentages ici font foi. Modifier = changer les droits des clients.
// Toutes les formules partagent la MÊME frontière : plus de 24 h avant la
// séance / moins de 24 h avant. Seuls les pourcentages changent.
const POLICIES: Record<CancellationPolicy, PolicyDef> = {
  // Souple : annulation gratuite jusqu'à 24 h avant.
  flexible: {
    id: "flexible",
    tiers: [
      { minHoursBefore: 24, refund: 1 }, // plus de 24 h avant : 100 % remboursé
      { minHoursBefore: 0, refund: 0.5 }, // moins de 24 h avant : 50 %
    ],
  },
  // Modérée (par défaut) : le coach garde 25 % même en annulation anticipée.
  moderate: {
    id: "moderate",
    tiers: [
      { minHoursBefore: 24, refund: 0.75 }, // plus de 24 h avant : 75 % remboursé
      { minHoursBefore: 0, refund: 0 }, // moins de 24 h avant : 0 %
    ],
  },
  // Stricte : moitié remboursée même en anticipé, rien à moins de 24 h.
  strict: {
    id: "strict",
    tiers: [
      { minHoursBefore: 24, refund: 0.5 }, // plus de 24 h avant : 50 % remboursé
      { minHoursBefore: 0, refund: 0 }, // moins de 24 h avant : 0 %
    ],
  },
};

export function isPolicy(v: unknown): v is CancellationPolicy {
  return v === "flexible" || v === "moderate" || v === "strict";
}

export function normalizePolicy(v: unknown): CancellationPolicy {
  return isPolicy(v) ? v : DEFAULT_POLICY;
}

// Fraction remboursée au client (0 → 1) pour une annulation `now` d'une séance
// qui démarre à `startsAt`. Après le début (no-show), on rembourse 0.
export function refundFraction(
  policy: CancellationPolicy,
  startsAt: Date,
  now: Date = new Date()
): number {
  const hoursBefore = (startsAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursBefore <= 0) return 0; // séance passée / no-show
  for (const tier of POLICIES[normalizePolicy(policy)].tiers) {
    if (hoursBefore >= tier.minHoursBefore) return tier.refund;
  }
  return 0;
}

// Montant remboursé (en centimes) pour une annulation donnée.
export function refundCents(
  policy: CancellationPolicy,
  startsAt: Date,
  amountCents: number,
  now: Date = new Date()
): number {
  return Math.round(amountCents * refundFraction(policy, startsAt, now));
}

// Paliers exposables à l'UI (profil coach, modale de réservation, charte).
export function policyTiers(policy: CancellationPolicy): Tier[] {
  return POLICIES[normalizePolicy(policy)].tiers;
}
