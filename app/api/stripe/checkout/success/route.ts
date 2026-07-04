import { NextRequest, NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfillCheckout";

export const dynamic = "force-dynamic";

// Retour après paiement Stripe. L'enregistrement (client, séance, paiement
// retenu, pack) vit dans fulfillCheckoutSession, partagé avec le webhook
// checkout.session.completed : si le client ferme l'onglet avant de revenir
// ici, le webhook fait le travail quand même. Idempotent des deux côtés.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  let slug = "";
  let bookingId = "";
  let conflict = false;
  if (sessionId) {
    try {
      const r = await fulfillCheckoutSession(sessionId);
      slug = r.slug;
      bookingId = r.bookingId;
      conflict = r.conflict;
    } catch (e) {
      console.error("[checkout/success]", e);
    }
  }

  if (conflict) {
    // Créneau pris entre-temps : remboursé à 100 %, on l'explique sur le
    // profil du coach.
    return NextResponse.redirect(`${origin}/${slug || "coachs"}?conflict=1`);
  }
  if (bookingId) {
    return NextResponse.redirect(`${origin}/reservation/${bookingId}?paid=1`);
  }
  return NextResponse.redirect(`${origin}/${slug || "coachs"}?paid=1`);
}
