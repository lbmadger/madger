import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Crée une session de paiement Stripe pour réserver une prestation payante.
// SÉQUESTRE : la charge est faite sur le compte PLATEFORME (pas de stripeAccount)
// → l'argent est retenu par Madger, puis transféré au coach après la séance
// (24 h) si rien n'est signalé. Le coach doit avoir un compte Connect actif
// (stripe_charges_enabled) pour pouvoir recevoir son versement plus tard.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const body = await req.json();
  const {
    coach_slug,
    service_id,
    first_name,
    last_name,
    email,
    phone,
    starts_at,
    duration_min,
    online,
    message,
  } = body;

  if (!coach_slug || !service_id || !first_name || !email || !starts_at) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, stripe_account_id, stripe_charges_enabled")
    .eq("slug", coach_slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach || !coach.stripe_charges_enabled || !coach.stripe_account_id) {
    return NextResponse.json({ error: "coach_cannot_charge" }, { status: 400 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("name, price_cents, currency")
    .eq("id", service_id)
    .eq("coach_id", coach.id)
    .eq("active", true)
    .maybeSingle();
  if (!service || service.price_cents <= 0) {
    return NextResponse.json({ error: "invalid_service" }, { status: 400 });
  }

  // Charge sur le compte plateforme (pas d'option stripeAccount) → séquestre.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: service.currency || "eur",
          product_data: { name: service.name },
          unit_amount: service.price_cents,
        },
        quantity: 1,
      },
    ],
    customer_email: String(email),
    payment_intent_data: {
      // Regroupe charge et futur transfert vers le coach (charges séparées).
      transfer_group: `coach_${coach.id}`,
    },
    success_url: `${origin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${coach_slug}`,
    metadata: {
      coach_id: coach.id,
      coach_slug: String(coach_slug),
      service_id: String(service_id),
      first_name: String(first_name).slice(0, 80),
      last_name: last_name ? String(last_name).slice(0, 80) : "",
      email: String(email).slice(0, 254),
      phone: phone ? String(phone).slice(0, 30) : "",
      starts_at: String(starts_at),
      duration_min: String(Number(duration_min) || 60),
      online: online ? "1" : "0",
      message: message ? String(message).slice(0, 500) : "",
    },
  });

  return NextResponse.json({ url: session.url });
}
