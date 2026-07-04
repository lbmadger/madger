import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { subPeriodEnd, invoiceSubscriptionId } from "@/lib/stripe/subscription";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Webhook Stripe pour l'abonnement Pro (compte plateforme). Maintient pro_until
// à jour au fil des renouvellements et des annulations. Configurer l'endpoint
// dans Stripe → Developers → Webhooks, et STRIPE_WEBHOOK_SECRET côté serveur.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !secret || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // Prolonge/maj pro_until à partir d'un abonnement Stripe. Deux familles
  // d'abonnements passent par ce webhook : l'abonnement PRO des coachs et les
  // abonnements MENSUELS des clients chez un coach (metadata.kind =
  // "client_sub") : ces derniers mettent à jour le registre local, jamais
  // pro_until.
  async function applyFromSubscription(sub: Stripe.Subscription) {
    if (sub.metadata?.kind === "client_sub") {
      await supabase
        .from("client_subscriptions")
        .update({
          status: sub.status,
          current_period_end: subPeriodEnd(sub),
        })
        .eq("stripe_subscription_id", sub.id);
      return;
    }
    const coachId = sub.metadata?.coach_id;
    if (!coachId) return;
    const periodEnd = subPeriodEnd(sub);
    await supabase.rpc("apply_pro_subscription", {
      p_coach_id: coachId,
      p_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      p_subscription_id: sub.id,
      p_status: sub.status,
      p_plan: sub.metadata?.plan ?? null,
      p_period_end: periodEnd,
    });
  }

  try {
    switch (event.type) {
      // Paiement d'une séance (séquestre) : enregistre la réservation même si
      // le client ne revient jamais de la page Stripe. Idempotent (index
      // unique sur stripe_payment_intent_id).
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "payment") {
          const { fulfillCheckoutSession } = await import(
            "@/lib/stripe/fulfillCheckout"
          );
          await fulfillCheckoutSession(s.id);
        } else if (
          s.mode === "subscription" &&
          s.metadata?.kind === "client_sub"
        ) {
          const { fulfillSubscriptionSession } = await import(
            "@/lib/stripe/fulfillSubscription"
          );
          await fulfillSubscriptionSession(s.id);
        }
        break;
      }
      // Litige (chargeback) : gèle le paiement pour bloquer tout versement
      // au coach tant que le litige n'est pas résolu.
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
        if (chargeId) {
          await supabase
            .from("payments")
            .update({
              escrow_status: "disputed",
              disputed_at: new Date().toISOString(),
            })
            .eq("stripe_charge_id", chargeId)
            .eq("escrow_status", "held");
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(invoice);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applyFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applyFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
    }
  } catch {
    // On renvoie 200 : Stripe réessaie sinon en boucle. Les erreurs ponctuelles
    // sont rattrapées au renouvellement suivant / au retour de session.
  }

  return NextResponse.json({ received: true });
}
