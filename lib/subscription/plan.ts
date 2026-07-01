// Statut d'abonnement dérivé du coach. Un coach est "Pro" tant que pro_until
// est dans le futur ; sinon "Free".

export function isPro(proUntil: string | null | undefined): boolean {
  if (!proUntil) return false;
  return new Date(proUntil).getTime() > Date.now();
}

// Nombre de jours restants de Pro (0 si Free/expiré).
export function proDaysLeft(proUntil: string | null | undefined): number {
  if (!proUntil) return 0;
  const ms = new Date(proUntil).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}
