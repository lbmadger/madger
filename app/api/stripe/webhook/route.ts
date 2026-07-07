import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { subPeriodEnd, invoiceSubscriptionId } from "@/lib/stripe/subscription";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { isPro } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";
// L'enregistrement d'un paiement (webhook) peut dépasser 10 s : marge large.
export const maxDuration = 60;

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
          // « canceling » : encore actif mais s'arrête à la fin de la
          // période payée (le client a demandé l'arrêt).
          status:
            sub.cancel_at_period_end && sub.status === "active"
              ? "canceling"
              : sub.status,
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
        } else if (s.mode === "subscription" && s.metadata?.coach_id) {
          // Souscription initiale au plan Pro : email de bienvenue au coach
          // (les renouvellements passent par invoice.paid, sans re-email).
          try {
            const { data: coachAuth } = await supabase.auth.admin.getUserById(
              s.metadata.coach_id
            );
            if (coachAuth?.user?.email) {
              const { proWelcomeCoach } = await import("@/lib/email/templates");
              const { sendEmail } = await import("@/lib/email/resend");
              const { data: coachPrefs } = await supabase
                .from("coaches")
                .select("locale")
                .eq("id", s.metadata.coach_id)
                .maybeSingle();
              const tpl = proWelcomeCoach({
                locale: coachPrefs?.locale === "en" ? "en" : "fr",
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://madger.app"}/dashboard`,
              });
              await sendEmail({
                to: coachAuth.user.email,
                subject: tpl.subject,
                html: tpl.html,
              });
            }
          } catch {
            /* best-effort */
          }
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
      // Fin de litige : Stripe a tranché. Sans ce handler, une ligne disputed
      // gagnée resterait gelée à vie (plus aucun versement possible).
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
        if (chargeId) {
          if (dispute.status === "won") {
            // Litige gagné : la ligne redevient libérable par le cron
            // (conditionnel : ne touche que les lignes encore gelées).
            await supabase
              .from("payments")
              .update({ escrow_status: "held" })
              .eq("stripe_charge_id", chargeId)
              .eq("escrow_status", "disputed");
          } else if (dispute.status === "lost") {
            // Litige perdu : la banque a rendu l'argent au client, on solde
            // la ligne (montant de la charge, dispute.amount en secours).
            let lostAmount = dispute.amount ?? 0;
            try {
              const ch = await stripe.charges.retrieve(chargeId);
              lostAmount = ch.amount ?? lostAmount;
            } catch {
              /* montant de la charge indisponible : celui du litige suffit */
            }
            await supabase
              .from("payments")
              .update({
                refunded_cents: lostAmount,
                escrow_status: "refunded",
                status: "refunded",
              })
              .eq("stripe_charge_id", chargeId)
              .eq("escrow_status", "disputed");
          }
        }
        break;
      }
      // Remboursement effectué HORS de l'app (dashboard Stripe, outil
      // externe) : synchronise refunded_cents, sinon le cron verserait au
      // coach une part d'argent déjà rendue au client.
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const refunded = ch.amount_refunded ?? 0;
        await supabase
          .from("payments")
          .update({ refunded_cents: refunded })
          .eq("stripe_charge_id", ch.id)
          .in("escrow_status", ["held", "authorized", "disputed"]);
        // Tout remboursé : plus rien à verser, on clôture le séquestre
        // (conditionnel : ne touche jamais une ligne déjà released).
        if (refunded >= (ch.amount ?? 0)) {
          await supabase
            .from("payments")
            .update({ escrow_status: "refunded", status: "refunded" })
            .eq("stripe_charge_id", ch.id)
            .in("escrow_status", ["held", "authorized"]);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(invoice);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applyFromSubscription(sub);
          // Abonnement CLIENT chez un coach : chaque échéance encaissée entre
          // dans la comptabilité (facture client, commission Madger, CSV).
          // Idempotent via l'index unique sur stripe_payment_intent_id.
          if (
            sub.metadata?.kind === "client_sub" &&
            (invoice.amount_paid ?? 0) > 0
          ) {
            const { data: reg } = await supabase
              .from("client_subscriptions")
              .select("coach_id, client_id, service_id")
              .eq("stripe_subscription_id", sub.id)
              .maybeSingle();
            if (reg) {
              // La commission de l'abonnement est figée à sa création : si le
              // statut Pro du coach a changé depuis, on réaligne la
              // subscription Stripe (0 % en Pro, 5 % sinon) pour les
              // échéances suivantes. Best-effort.
              try {
                const { data: coachPro } = await supabase
                  .from("coaches")
                  .select("pro_until")
                  .eq("id", reg.coach_id)
                  .maybeSingle();
                const expectedFee = isPro(coachPro?.pro_until) ? 0 : 5;
                const currentFee =
                  (
                    sub as Stripe.Subscription & {
                      application_fee_percent?: number | null;
                    }
                  ).application_fee_percent ?? 0;
                if (currentFee !== expectedFee) {
                  await stripe.subscriptions.update(sub.id, {
                    application_fee_percent: expectedFee,
                  });
                }
              } catch {
                /* réalignement raté : retenté à la prochaine échéance */
              }
              const inv = invoice as Stripe.Invoice & {
                charge?: string | Stripe.Charge | null;
                payment_intent?: string | Stripe.PaymentIntent | null;
              };
              // Commission réellement prélevée (application fee de la charge).
              let commission = 0;
              let chargeId: string | null = null;
              try {
                chargeId =
                  typeof inv.charge === "string"
                    ? inv.charge
                    : inv.charge?.id ?? null;
                if (chargeId) {
                  const ch = await stripe.charges.retrieve(chargeId);
                  commission =
                    typeof ch.application_fee_amount === "number"
                      ? ch.application_fee_amount
                      : 0;
                }
              } catch {
                /* commission inconnue : 0 par défaut */
              }
              const piId =
                typeof inv.payment_intent === "string"
                  ? inv.payment_intent
                  : inv.payment_intent?.id ?? null;
              await supabase.from("payments").insert({
                coach_id: reg.coach_id,
                client_id: reg.client_id,
                service_id: reg.service_id,
                booking_id: null,
                amount_cents: invoice.amount_paid,
                currency: invoice.currency || "eur",
                status: "paid",
                stripe_payment_intent_id: piId ?? `sub_inv_${invoice.id}`,
                stripe_charge_id: chargeId,
                paid_at: new Date().toISOString(),
                // Versé directement au coach par Stripe (destination charge) :
                // aucun séquestre, la ligne est immédiatement soldée.
                escrow_status: "released",
                released_at: new Date().toISOString(),
                commission_cents: commission,
                payout_cents: Math.max(
                  0,
                  (invoice.amount_paid ?? 0) - commission
                ),
              });
            }
          }
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
    // Événements MONÉTAIRES : une erreur de traitement laisserait la base
    // désynchronisée pour toujours (ex. refunded_cents jamais posé → le cron
    // verserait au coach de l'argent déjà rendu au client). On renvoie 500
    // pour que Stripe rejoue l'événement (les handlers sont idempotents).
    const monetary = new Set([
      "charge.refunded",
      "charge.dispute.created",
      "charge.dispute.closed",
      "invoice.paid",
    ]);
    if (monetary.has(event.type)) {
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
    // Les autres types restent en 200 : ils sont rattrapés au renouvellement
    // suivant / au retour de session, inutile que Stripe boucle dessus.
  }

  return NextResponse.json({ received: true });
}
