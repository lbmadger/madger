import type { NextRequest } from "next/server";

// Autorisation des crons : jeton CRON_SECRET (envoyé par Vercel en
// Authorization: Bearer) OU en-tête x-vercel-cron posé par la plateforme.
// Fail-closed : sans l'un des deux, refus. Ces routes déclenchent des
// transferts/remboursements Stripe et des emails, jamais publiques.
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }
  return Boolean(req.headers.get("x-vercel-cron"));
}
