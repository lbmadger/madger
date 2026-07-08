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
                .select("locale, stripe_subscription_id")
                .eq("id", s.metadata.coach_id)
                .maybeSingle();
              // Redélivrance Stripe : la subscription déjà enregistrée sur
              // le coach signifie que ce même événement a déjà été traité,
              // on ne renvoie pas l'email de bienvenue.
              const subId =
                typeof s.subscription === "string"
                  ? s.subscription
                  : s.subscription?.id ?? null;
              if (subId && coachPrefs?.stripe_subscription_id === subId) {
                break;
              }
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
          const { data: frozen } = await supabase
            .from("payments")
            .update({
              escrow_status: "disputed",
              disputed_at: new Date().toISOString(),
            })
            .eq("stripe_charge_id", chargeId)
            .eq("escrow_status", "held")
            .select("id, coach_id, client_id, amount_cents, currency");
          // Alerte email aux admins (même patron que bookings/report).
          // Best-effort : un échec d'email ne doit jamais faire rejouer un
          // événement monétaire. IMPORTANT : les chargebacks arrivent le
          // plus souvent APRÈS la libération à J+1 (ligne released, rien de
          // gelé) : l'alerte part donc dans TOUS les cas, en signalant si
          // les fonds sont déjà versés.
          try {
            let p = frozen?.[0] ?? null;
            let alreadyReleased = false;
            if (!p) {
              const { data: found } = await supabase
                .from("payments")
                .select("id, coach_id, client_id, amount_cents, currency, escrow_status")
                .eq("stripe_charge_id", chargeId)
                .maybeSingle();
              if (found) {
                p = found;
                alreadyReleased = found.escrow_status === "released";
              }
            }
            const admins = (process.env.ADMIN_EMAILS || "")
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean);
            if (p && admins.length) {
              const { disputeOpenedAdmin } = await import(
                "@/lib/email/templates"
              );
              const { sendEmail } = await import("@/lib/email/resend");
              const APP_URL =
                process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
              const [{ data: coach }, { data: clientRow }] = await Promise.all([
                supabase
                  .from("coaches")
                  .select("first_name, last_name")
                  .eq("id", p.coach_id)
                  .maybeSingle(),
                supabase
                  .from("clients")
                  .select("first_name, last_name")
                  .eq("id", p.client_id)
                  .maybeSingle(),
              ]);
              const tpl = disputeOpenedAdmin({
                clientName:
                  [clientRow?.first_name, clientRow?.last_name]
                    .filter(Boolean)
                    .join(" ") || "Client",
                coachName:
                  [coach?.first_name, coach?.last_name]
                    .filter(Boolean)
                    .join(" ") || "Coach",
                amountStr: ((p.amount_cents ?? 0) / 100).toLocaleString(
                  "fr-FR",
                  {
                    style: "currency",
                    currency: (p.currency || "eur").toUpperCase(),
                  }
                ),
                reason:
                  [
                    dispute.reason || null,
                    alreadyReleased
                      ? "ATTENTION : fonds deja verses au coach (chargeback post-liberation)"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null,
                adminUrl: `${APP_URL}/admin/litiges`,
              });
              for (const to of admins) {
                await sendEmail({ to, subject: tpl.subject, html: tpl.html });
              }
            }
          } catch {
            /* best-effort */
          }
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
          if (dispute.status === "lost") {
            // Litige perdu : la banque a rendu au client le montant CONTESTÉ
            // (souvent partiel). On cumule, et on ne solde la ligne que si
            // tout le paiement est reparti ; sinon le reste redevient
            // libérable (les caps refunded_cents protègent le versement).
            const { data: row } = await supabase
              .from("payments")
              .select("id, amount_cents, refunded_cents")
              .eq("stripe_charge_id", chargeId)
              .eq("escrow_status", "disputed")
              .maybeSingle();
            if (row) {
              const amount = (row.amount_cents as number) ?? 0;
              const already = (row.refunded_cents as number) ?? 0;
              const lost = Math.min(
                amount,
                already + (dispute.amount ?? amount)
              );
              await supabase
                .from("payments")
                .update(
                  lost >= amount
                    ? {
                        refunded_cents: lost,
                        escrow_status: "refunded",
                        status: "refunded",
                      }
                    : { refunded_cents: lost, escrow_status: "held" }
                )
                .eq("id", row.id)
                .eq("escrow_status", "disputed");
            }
          } else {
            // Gagné, ou clos sans suite (warning_closed, inquiry) : la ligne
            // redevient libérable, sinon elle resterait gelée à vie.
            await supabase
              .from("payments")
              .update({ escrow_status: "held" })
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
              const { error: insertError } = await supabase
                .from("payments")
                .insert({
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
              // Échéance encaissée : le coach est prévenu (best-effort, et
              // seulement si l'insert a gagné : un rejeu du webhook ne doit
              // pas renvoyer l'email).
              if (!insertError) {
                try {
                  const [{ data: coachAuth }, { data: coachRow }, { data: clientRow }] =
                    await Promise.all([
                      supabase.auth.admin.getUserById(reg.coach_id as string),
                      supabase
                        .from("coaches")
                        .select("locale")
                        .eq("id", reg.coach_id)
                        .maybeSingle(),
                      supabase
                        .from("clients")
                        .select("first_name, last_name")
                        .eq("id", reg.client_id)
                        .maybeSingle(),
                    ]);
                  if (coachAuth?.user?.email) {
                    const { subscriptionPaymentCoach } = await import(
                      "@/lib/email/templates"
                    );
                    const { sendEmail } = await import("@/lib/email/resend");
                    const coachLocale =
                      coachRow?.locale === "en" ? ("en" as const) : ("fr" as const);
                    const fmt = (cents: number) =>
                      (cents / 100).toLocaleString(
                        coachLocale === "en" ? "en-GB" : "fr-FR",
                        {
                          style: "currency",
                          currency: (invoice.currency || "eur").toUpperCase(),
                        }
                      );
                    const tpl = subscriptionPaymentCoach({
                      locale: coachLocale,
                      clientName:
                        [clientRow?.first_name, clientRow?.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                        (coachLocale === "en" ? "your client" : "ton client"),
                      amountStr: fmt(invoice.amount_paid ?? 0),
                      commissionStr:
                        commission > 0 ? fmt(commission) : undefined,
                      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://madger.app"}/dashboard/paiements`,
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
            }
          }
        }
        break;
      }
      // Échec du prélèvement d'un abonnement mensuel CLIENT : le client est
      // invité à mettre à jour sa carte. Ce case ne figure PAS dans la liste
      // des événements monétaires (catch final) : un échec d'email ne doit
      // pas faire rejouer l'événement en boucle par Stripe.
      case "invoice.payment_failed": {
        try {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = invoiceSubscriptionId(invoice);
          if (!subId) break;
          const sub = await stripe.subscriptions.retrieve(subId);
          if (sub.metadata?.kind !== "client_sub") break;
          const { data: reg } = await supabase
            .from("client_subscriptions")
            .select("coach_id, client_id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();
          if (!reg) break;
          const [{ data: clientRow }, { data: coachRow }] = await Promise.all([
            supabase
              .from("clients")
              .select("email")
              .eq("id", reg.client_id)
              .maybeSingle(),
            supabase
              .from("coaches")
              .select("first_name, last_name")
              .eq("id", reg.coach_id)
              .maybeSingle(),
          ]);
          if (clientRow?.email) {
            const { subscriptionPaymentFailedClient } = await import(
              "@/lib/email/templates"
            );
            const { sendEmail } = await import("@/lib/email/resend");
            const tpl = subscriptionPaymentFailedClient({
              coachName:
                [coachRow?.first_name, coachRow?.last_name]
                  .filter(Boolean)
                  .join(" ") || "ton coach",
            });
            await sendEmail({
              to: clientRow.email,
              subject: tpl.subject,
              html: tpl.html,
            });
          }
        } catch {
          /* best-effort : simple notification */
        }
        break;
      }
      case "customer.subscription.updated": {
        await applyFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Lu AVANT applyFromSubscription : un statut déjà 'canceled' signale
        // une redélivrance de l'événement, on ne renvoie pas l'email.
        let wasAlreadyCanceled = false;
        if (sub.metadata?.coach_id && sub.metadata?.kind !== "client_sub") {
          const { data: prev } = await supabase
            .from("coaches")
            .select("subscription_status")
            .eq("id", sub.metadata.coach_id)
            .maybeSingle();
          wasAlreadyCanceled = prev?.subscription_status === "canceled";
        }
        await applyFromSubscription(sub);
        // Fin de l'abonnement PRO d'un coach (jamais pour les abonnements
        // clients) : email chaleureux, retour en Basic + CTA réactiver.
        if (
          sub.metadata?.coach_id &&
          sub.metadata?.kind !== "client_sub" &&
          !wasAlreadyCanceled
        ) {
          try {
            const [{ data: coachAuth }, { data: coachPrefs }] =
              await Promise.all([
                supabase.auth.admin.getUserById(sub.metadata.coach_id),
                supabase
                  .from("coaches")
                  .select("locale")
                  .eq("id", sub.metadata.coach_id)
                  .maybeSingle(),
              ]);
            if (coachAuth?.user?.email) {
              const { proCancelledCoach } = await import(
                "@/lib/email/templates"
              );
              const { sendEmail } = await import("@/lib/email/resend");
              const tpl = proCancelledCoach({
                locale: coachPrefs?.locale === "en" ? "en" : "fr",
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://madger.app"}/dashboard/abonnement`,
              });
              await sendEmail({
                to: coachAuth.user.email,
                subject: tpl.subject,
                html: tpl.html,
                replyTo: "contact@madger.app",
              });
            }
          } catch {
            /* best-effort */
          }
        }
        break;
      }
    }
  } catch {
    // Événements MONÉTAIRES : une erreur de traitement laisserait la base
    // désynchronisée pour toujours (ex. refunded_cents jamais posé → le cron
    // verserait au coach de l'argent déjà rendu au client). On renvoie 500
    // pour que Stripe rejoue l'événement (les handlers sont idempotents).
    const monetary = new Set([
      // fulfill est idempotent (index unique sur le PaymentIntent) : un
      // échec ici sans retry = client débité sans réservation enregistrée.
      "checkout.session.completed",
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
