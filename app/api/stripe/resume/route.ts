import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Réactive un abonnement Pro arrêté en fin de période (cancel_at_period_end)
// avant qu'il ne s'arrête : l'abonnement reprend comme si de rien n'était.
export async function POST() {
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
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.stripe_subscription_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }
  const admin = createAdmin(SUPABASE_URL, serviceKey);
  try {
    const sub = await stripe.subscriptions.update(coach.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    await admin
      .from("coaches")
      .update({ subscription_status: sub.status, subscription_cancel_at: null })
      .eq("id", coach.id);
    await admin
      .from("churn_feedback")
      .update({ outcome: "stayed" })
      .eq("coach_id", coach.id)
      .eq("outcome", "cancelled");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
