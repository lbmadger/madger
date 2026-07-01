import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Abonnement Pro : le coach paie Madger sur le compte PLATEFORME (≠ Connect).
// 49 €/mois ou 490 €/an. Les prix sont créés en ligne (price_data récurrent),
// pas besoin de produits pré-créés dans le dashboard Stripe.
const PLANS = {
  monthly: { amount: 4900, interval: "month" as const },
  annual: { amount: 49000, interval: "year" as const },
};

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const body = await req.json().catch(() => ({}));
  const plan = body.plan === "annual" ? "annual" : "monthly";
  const cfg = PLANS[plan];

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "not_a_coach" }, { status: 403 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(coach.stripe_customer_id
      ? { customer: coach.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Madger Pro" },
          unit_amount: cfg.amount,
          recurring: { interval: cfg.interval },
        },
        quantity: 1,
      },
    ],
    subscription_data: { metadata: { coach_id: coach.id, plan } },
    metadata: { coach_id: coach.id, plan },
    success_url: `${origin}/api/stripe/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/abonnement`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
