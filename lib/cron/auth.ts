import type { NextRequest } from "next/server";

// Autorisation des crons. Ces routes déclenchent des transferts et des
// remboursements Stripe : fail-closed.
//  - CRON_SECRET configuré : SEUL le jeton Authorization: Bearer est accepté.
//    L'en-tête x-vercel-cron n'est pas une preuve (il n'est pas retiré des
//    requêtes entrantes externes : n'importe qui peut l'ajouter).
//  - Sans CRON_SECRET (projet pas encore configuré) : on retombe sur
//    x-vercel-cron, faute de mieux.
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return req.headers.get("authorization") === `Bearer ${secret}`;
  }
  return Boolean(req.headers.get("x-vercel-cron"));
}
