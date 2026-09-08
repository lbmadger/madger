import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { currentMonthlyCents, currentAnnualCents } from "@/lib/subscription/offer";

export const dynamic = "force-dynamic";

// Abonnement Pro : le coach paie Madger sur le compte PLATEFORME (≠ Connect).
// Prix du moment (lancement puis tarif normal, lib/subscription/offer.ts).
// Les prix sont créés en ligne (price_data récurrent), pas besoin de
// produits pré-créés dans le dashboard Stripe.
function plans() {
  return {
    monthly: { amount: currentMonthlyCents(), interval: "month" as const },
    annual: { amount: currentAnnualCents(), interval: "year" as const },
  };
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const body = await req.json().catch(() => ({}));
  const plan = body.plan === "annual" ? "annual" : "monthly";
  const cfg = plans()[plan];

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, stripe_customer_id, stripe_subscription_id, pro_trial_used_at, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "not_a_coach" }, { status: 403 });
  }
  // Un abonnement Stripe encore vivant (même impayé) : pas de second
  // abonnement, sinon Stripe encaisserait les deux une fois la carte réparée.
  if (
    coach.stripe_subscription_id &&
    ["active", "trialing", "canceling", "past_due", "unpaid"].includes(
      coach.subscription_status ?? ""
    )
  ) {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  // Essai de 7 jours : carte enregistrée, rien débité pendant l'essai, puis
  // renouvellement automatique par Stripe sauf résiliation. Une seule fois
  // par coach (jamais d'abonnement auparavant, essai jamais consommé).
  const trial = !coach.stripe_subscription_id && !coach.pro_trial_used_at;

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
    subscription_data: {
      metadata: { coach_id: coach.id, plan },
      ...(trial ? { trial_period_days: 7 } : {}),
    },
    // Carte demandée même pendant l'essai : c'est ce qui permet le
    // renouvellement automatique sans action du coach.
    payment_method_collection: "always",
    metadata: { coach_id: coach.id, plan },
    // Paiement EMBARQUÉ : le formulaire s'affiche dans /paiement.
    ui_mode: "embedded_page",
    return_url: `${origin}/api/stripe/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ client_secret: session.client_secret, trial });
}
