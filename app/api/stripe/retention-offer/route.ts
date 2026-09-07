import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Geste de rétention : 1 mois de Pro offert (crédit de 49 € sur la prochaine
// facture Stripe) pour un coach qui allait résilier. UNE seule fois par
// coach, abonnement actif requis. La raison donnée est journalisée.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const reason = body.reason ? String(body.reason).slice(0, 40) : "other";
  const details = body.details ? String(body.details).slice(0, 1000) : null;

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan, retention_offer_used_at"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.stripe_customer_id || !coach.stripe_subscription_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }
  if (coach.retention_offer_used_at) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }
  if (!["active", "trialing", "canceling"].includes(coach.subscription_status ?? "")) {
    return NextResponse.json({ error: "not_active" }, { status: 409 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  // Réclamé AVANT l'appel Stripe : un double clic ne crédite pas deux fois.
  const { data: claimed } = await admin
    .from("coaches")
    .update({ retention_offer_used_at: new Date().toISOString() })
    .eq("id", coach.id)
    .is("retention_offer_used_at", null)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }
  try {
    await stripe.customers.createBalanceTransaction(coach.stripe_customer_id, {
      amount: -4900,
      currency: "eur",
      description: "Madger : 1 mois de Pro offert",
    });
    // S'il avait déjà programmé l'arrêt, on le réactive dans le même geste.
    if (coach.subscription_status === "canceling") {
      const sub = await stripe.subscriptions.update(coach.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      await admin
        .from("coaches")
        .update({ subscription_status: sub.status, subscription_cancel_at: null })
        .eq("id", coach.id);
    }
    await admin.from("churn_feedback").insert({
      coach_id: coach.id,
      reason,
      details,
      plan: coach.subscription_plan ?? null,
      outcome: "offer_accepted",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await admin
      .from("coaches")
      .update({ retention_offer_used_at: null })
      .eq("id", coach.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
