// Plans Madger et taux de frais de transaction.
//
//   essential : 0 € / mois, 5 % de frais de transaction, tout compris
//   pro       : 49 € / mois, 3 % de frais de transaction, tout compris
//   studio    : 149 € / mois, 0 % de frais Madger, frais Stripe au coût réel
//               (présent dans le modèle et le calcul UNIQUEMENT : aucune
//               interface, aucun email, aucune colonne ne l'active encore)
//
// « Tout compris » : les frais Stripe carte sont supportés par Madger, ils ne
// sont pas déduits du versement du coach. Seule exception, le paiement en
// 3 fois (Klarna, Alma), activé par le coach : ses frais restent à sa
// charge (cf. lib/stripe/installments.ts).
//
// Le taux est FIGÉ sur chaque transaction à la création de la ligne
// payments (fee_rate_bps) : un changement de plan ne touche jamais les
// transactions passées.

export type Plan = "essential" | "pro" | "studio";

export const PLANS: readonly Plan[] = ["essential", "pro", "studio"] as const;

// Taux Madger en points de base (1 % = 100 bps).
export const FEE_RATE_BPS: Record<Plan, number> = {
  essential: 500,
  pro: 300,
  studio: 0,
};

// Un coach est "Pro" tant que pro_until est dans le futur ; sinon Essentiel.
export function isPro(proUntil: string | null | undefined): boolean {
  if (!proUntil) return false;
  return new Date(proUntil).getTime() > Date.now();
}

// Ligne coaches lue directement en base (sans passer par getCoach, qui
// surcharge déjà pro_until). Le Pro effectif = max(pro_until réel,
// pro_bonus_until offert par parrainage ou code). Toujours sélectionner les
// DEUX colonnes et passer par isProRow / planOf : sinon un coach Pro par
// bonus serait traité comme Essentiel côté serveur.
export type ProRow = {
  pro_until?: string | null;
  pro_bonus_until?: string | null;
};

export function effectiveProUntil(row: ProRow | null | undefined): string | null {
  if (!row) return null;
  const a = row.pro_until ? new Date(row.pro_until).getTime() : 0;
  const b = row.pro_bonus_until ? new Date(row.pro_bonus_until).getTime() : 0;
  if (!a && !b) return null;
  return b > a ? (row.pro_bonus_until as string) : (row.pro_until as string);
}

export function isProRow(row: ProRow | null | undefined): boolean {
  return isPro(effectiveProUntil(row));
}

// Plan courant du coach. Studio n'est activable par aucune colonne pour
// l'instant : le jour venu, une migration dédiée ajoutera le champ ici.
export function planOf(coach: ProRow | null | undefined): Plan {
  return isProRow(coach) ? "pro" : "essential";
}

export function feeRateBps(plan: Plan): number {
  return FEE_RATE_BPS[plan];
}

// Pourcentage entier pour Stripe (application_fee_percent) : 5, 3 ou 0.
export function feeRatePercent(plan: Plan): number {
  return FEE_RATE_BPS[plan] / 100;
}

export function isPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as readonly string[]).includes(v);
}

// Nombre de jours restants de Pro (0 si Essentiel/expiré).
export function proDaysLeft(proUntil: string | null | undefined): number {
  if (!proUntil) return 0;
  const ms = new Date(proUntil).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}
