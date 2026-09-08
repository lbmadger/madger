import type { NextRequest } from "next/server";

// Autorisation des crons. Ces routes déclenchent des transferts et des
// remboursements Stripe : fail-closed.
//  - CRON_SECRET configuré : SEUL le jeton Authorization: Bearer est accepté.
//    L'en-tête x-vercel-cron n'est pas une preuve (il n'est pas retiré des
//    requêtes entrantes externes : n'importe qui peut l'ajouter).
//  - Sans CRON_SECRET : REFUS. Un cron non configuré ne verse rien plutôt
//    que d'accepter n'importe quel appel externe (Vercel envoie
//    automatiquement le Bearer dès que CRON_SECRET est défini).
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
