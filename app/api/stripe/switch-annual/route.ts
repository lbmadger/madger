import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Rétention : bascule l'abonnement Pro MENSUEL actif vers l'ANNUEL
// (490 € au lieu de 12 × 49 € : 2 mois offerts) sans repasser par un
// checkout. Le prorata du mois en cours est crédité automatiquement.
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
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
    .select("id, stripe_subscription_id, subscription_plan")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.stripe_subscription_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }
  if (coach.subscription_plan === "annual") {
    return NextResponse.json({ error: "already_annual" }, { status: 409 });
  }

  try {
    const sub = await stripe.subscriptions.retrieve(
      coach.stripe_subscription_id
    );
    if (sub.status !== "active" && sub.status !== "trialing") {
      return NextResponse.json({ error: "not_active" }, { status: 409 });
    }
    const item = sub.items.data[0];
    if (!item) {
      return NextResponse.json({ error: "no_item" }, { status: 409 });
    }
    await stripe.subscriptions.update(
      sub.id,
      {
        items: [
          {
            id: item.id,
            price_data: {
              currency: "eur",
              product:
                typeof item.price.product === "string"
                  ? item.price.product
                  : item.price.product.id,
              unit_amount: 49000,
              recurring: { interval: "year" },
            },
          },
        ],
        // Le mois en cours déjà payé est crédité sur la facture annuelle.
        proration_behavior: "create_prorations",
        // Une éventuelle résiliation programmée est annulée : il reste.
        cancel_at_period_end: false,
        metadata: { ...sub.metadata, plan: "annual" },
      },
      { idempotencyKey: `switch_annual_${sub.id}` }
    );
    // Le webhook customer.subscription.updated synchronise pro_until et le
    // plan ; on pose le plan tout de suite pour un retour UI immédiat.
    // Colonne service-role only (0035) : client admin obligatoire.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const admin = createAdmin(SUPABASE_URL, serviceKey);
      await admin
        .from("coaches")
        .update({ subscription_plan: "annual" })
        .eq("id", coach.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
