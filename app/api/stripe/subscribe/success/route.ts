import { NextRequest, NextResponse } from "next/server";
import { fulfillSubscriptionSession } from "@/lib/stripe/fulfillSubscription";

export const dynamic = "force-dynamic";

// Retour après souscription d'un abonnement mensuel client. La logique vit
// dans fulfillSubscriptionSession, partagée avec le webhook
// checkout.session.completed : si le client ferme l'onglet avant de revenir,
// le webhook enregistre quand même. Idempotent des deux côtés.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  let slug = "";
  if (sessionId) {
    try {
      const r = await fulfillSubscriptionSession(sessionId);
      slug = r.slug;
    } catch (e) {
      console.error("[subscribe/success]", e);
    }
  }

  return NextResponse.redirect(`${origin}/${slug || "coachs"}?sub=1`);
}
