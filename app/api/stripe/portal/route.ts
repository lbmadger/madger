import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Portail de facturation Stripe : le coach y gère/annule son abonnement Pro,
// met à jour sa carte, télécharge ses factures. Renvoie un lien à usage unique.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.stripe_customer_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: coach.stripe_customer_id,
    return_url: `${origin}/dashboard/abonnement`,
  });

  return NextResponse.json({ url: session.url });
}
