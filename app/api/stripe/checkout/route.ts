import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { isPro } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

// Crée une session de paiement Stripe pour réserver une prestation payante.
// - Séance/pack : SÉQUESTRE. La charge est faite sur le compte PLATEFORME →
//   l'argent est retenu par Madger, puis transféré au coach après la séance
//   (24 h) si rien n'est signalé.
// - Abonnement mensuel : souscription récurrente versée directement au coach
//   (transfer_data), commission Madger en application_fee (5 % en Gratuit,
//   0 % en Pro). Pas de séquestre sur du récurrent.
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

  if (!coach_slug || !service_id || !first_name || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, stripe_account_id, stripe_charges_enabled, pro_until, booking_mode, min_notice_hours"
    )
    .eq("slug", coach_slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach || !coach.stripe_charges_enabled || !coach.stripe_account_id) {
    return NextResponse.json({ error: "coach_cannot_charge" }, { status: 400 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("name, price_cents, currency, type")
    .eq("id", service_id)
    .eq("coach_id", coach.id)
    .eq("active", true)
    .maybeSingle();
  if (!service || service.price_cents <= 0) {
    return NextResponse.json({ error: "invalid_service" }, { status: 400 });
  }

  // ── Abonnement mensuel : souscription récurrente, pas de créneau requis ───
  if (service.type === "subscription") {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: service.currency || "eur",
            product_data: { name: service.name },
            unit_amount: service.price_cents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      customer_email: String(email),
      subscription_data: {
        transfer_data: { destination: coach.stripe_account_id },
        // Commission Madger prélevée sur chaque échéance.
        ...(isPro(coach.pro_until) ? {} : { application_fee_percent: 5 }),
        metadata: {
          // `kind` distingue ces abonnements de l'abonnement Pro des coachs
          // dans le webhook (même endpoint).
          kind: "client_sub",
          coach_id: coach.id,
          service_id: String(service_id),
          client_email: String(email).slice(0, 254),
        },
      },
      success_url: `${origin}/api/stripe/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${coach_slug}?payment=canceled&book=${service_id}`,
      metadata: {
        kind: "client_sub",
        coach_id: coach.id,
        coach_slug: String(coach_slug),
        service_id: String(service_id),
        first_name: String(first_name).slice(0, 80),
        last_name: last_name ? String(last_name).slice(0, 80) : "",
        email: String(email).slice(0, 254),
        phone: phone ? String(phone).slice(0, 30) : "",
        message: message ? String(message).slice(0, 500) : "",
      },
    });
    return NextResponse.json({ url: session.url });
  }

  // ── Séance ou pack : un créneau est obligatoire ────────────────────────────
  if (!starts_at) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Préavis minimum du coach : en deçà, plus réservable.
  const noticeMs = ((coach.min_notice_hours as number) || 2) * 3600000;
  if (new Date(String(starts_at)).getTime() < Date.now() + noticeMs) {
    return NextResponse.json({ error: "too_soon" }, { status: 400 });
  }

  // Modèle Airbnb : en mode approbation, la carte est seulement AUTORISÉE
  // (empreinte bancaire). Le débit ne part que si le coach accepte ; refus ou
  // non-réponse → l'autorisation est simplement libérée, rien n'est prélevé.
  const approval = coach.booking_mode === "approval";

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
      ...(approval ? { capture_method: "manual" as const } : {}),
    },
    success_url: `${origin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${coach_slug}?payment=canceled&book=${service_id}`,
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
