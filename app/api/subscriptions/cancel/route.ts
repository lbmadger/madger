import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Arrêt d'un abonnement mensuel par le CLIENT (espace « Mes séances »).
// L'abonnement reste actif jusqu'à la fin de la période déjà payée
// (cancel_at_period_end), puis s'arrête sans nouveau prélèvement.
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
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subId = body.subscription_id as string | undefined;
  if (!subId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: sub } = await admin
    .from("client_subscriptions")
    .select("id, client_id, stripe_subscription_id, status")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // L'abonnement appartient-il bien au compte connecté (email) ?
  const { data: clientRow } = await admin
    .from("clients")
    .select("email")
    .eq("id", sub.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
      cancel_at_period_end: true,
    });
    await admin
      .from("client_subscriptions")
      .update({ status: "canceling" })
      .eq("id", sub.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
