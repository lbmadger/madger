import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import {
  subPeriodEnd,
  invoiceSubscriptionId,
  invoicePaymentIntentId,
  localSubStatus,
  monthlyCreditCents,
} from "@/lib/stripe/subscription";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { planOf, feeRatePercent, feeRateBps, planForRateBps } from "@/lib/subscription/plan";

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
          // Statut local normalisé (canceling = arrêt programmé en fin de
          // période, past_due = prélèvement en échec, canceled = terminé).
          status: localSubStatus(sub),
          current_period_end: subPeriodEnd(sub),
        })
        .eq("stripe_subscription_id", sub.id);
      return;
    }
    const coachId = sub.metadata?.coach_id;
    if (!coachId) return;
    const periodEnd = subPeriodEnd(sub);
    // Essai de 7 jours consommé : un seul par coach (migration 0062).
    if (sub.status === "trialing") {
      await supabase
        .from("coaches")
        .update({ pro_trial_used_at: new Date().toISOString() })
        .eq("id", coachId)
        .is("pro_trial_used_at", null);
    }
    // Statut local normalisé : « canceling » = encore actif OU en essai mais
    // arrêt programmé en fin de période (réactivable depuis l'app) ; les
    // statuts Stripe unpaid / incomplete / paused sont ramenés aux valeurs
    // connues de l'app (cf. localSubStatus).
    const status = localSubStatus(sub);
    const canceling = status === "canceling";
    await supabase.rpc("apply_pro_subscription", {
      p_coach_id: coachId,
      p_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      p_subscription_id: sub.id,
      p_status: status,
      p_plan: sub.metadata?.plan ?? null,
      p_period_end: periodEnd,
    });
    await supabase
      .from("coaches")
      .update({
        subscription_cancel_at: canceling
          ? sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : periodEnd
          : null,
      })
      .eq("id", coachId);
  }

  // Récompense un coach d'un mois de Pro : crédit d'un mois d'abonnement sur
  // son solde Stripe s'il est abonné (sa prochaine facture est réduite
  // d'autant : montant réellement payé, mensuel ou annuel ramené au mois,
  // prix de lancement inclus), sinon un mois d'accès Pro offert
  // (pro_bonus_until).
  async function rewardOneMonth(coachId: string) {
    const { data: c } = await supabase
      .from("coaches")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", coachId)
      .maybeSingle();
    const active =
      c?.subscription_status === "active" ||
      c?.subscription_status === "trialing" ||
      c?.subscription_status === "canceling";
    if (c?.stripe_customer_id && c.stripe_subscription_id && active && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(c.stripe_subscription_id);
        await stripe.customers.createBalanceTransaction(c.stripe_customer_id, {
          amount: -monthlyCreditCents(sub),
          currency: "eur",
          description: "Parrainage Madger : 1 mois de Pro offert",
        });
        return;
      } catch {
        /* repli sur l'accès offert si le crédit Stripe échoue */
      }
    }
    await supabase.rpc("grant_pro_bonus_month", { p_coach_id: coachId });
  }

  // Première souscription Pro d'un filleul → 1 mois offert au filleul ET au
  // parrain, une seule fois (verrou idempotent via referral_rewarded_at).
  async function maybeRewardReferral(coachId: string) {
    const { data: f } = await supabase
      .from("coaches")
      .select("referred_by, referral_rewarded_at")
      .eq("id", coachId)
      .maybeSingle();
    if (!f?.referred_by || f.referral_rewarded_at) return;
    // Pose le verrou : une seule livraison de webhook remporte la mise.
    const { data: claimed } = await supabase
      .from("coaches")
      .update({ referral_rewarded_at: new Date().toISOString() })
      .eq("id", coachId)
      .is("referral_rewarded_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) return;
    try {
      await rewardOneMonth(coachId);
      await rewardOneMonth(f.referred_by as string);
    } catch (e) {
      // Récompense ratée : on REND le verrou, sinon le mois offert serait
      // perdu silencieusement (Stripe rejouera l'événement).
      await supabase
        .from("coaches")
        .update({ referral_rewarded_at: null })
        .eq("id", coachId);
      throw e;
    }
  }

  try {
    switch (event.type) {
      // Paiement d'une séance (séquestre) : enregistre la réservation même si
      // le client ne revient jamais de la page Stripe. Idempotent (index
      // unique sur stripe_payment_intent_id).
      // async_payment_succeeded : moyens à confirmation différée (Klarna sur
      // les packs) : la session est complétée d'abord « unpaid », puis payée.
      // fulfill est idempotent et ignore les sessions non payées.
      case "checkout.session.async_payment_succeeded":
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
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : s.subscription?.id ?? null;
          // Lu AVANT d'appliquer l'abonnement : une subscription déjà
          // enregistrée sur le coach signifie une redélivrance Stripe de ce
          // même événement (pas de second email de bienvenue).
          const { data: coachPrefs } = await supabase
            .from("coaches")
            .select("locale, stripe_subscription_id")
            .eq("id", s.metadata.coach_id)
            .maybeSingle();
          const alreadyProcessed =
            !!subId && coachPrefs?.stripe_subscription_id === subId;

          // Souscription initiale au plan Pro : l'abonnement est appliqué
          // ICI aussi (pro_until, statut, essai consommé), pour ne pas
          // dépendre du retour navigateur du coach.
          try {
            if (subId && stripe) {
              const sub = await stripe.subscriptions.retrieve(subId);
              if (!sub.metadata?.coach_id) {
                sub.metadata = { ...sub.metadata, coach_id: s.metadata.coach_id, plan: s.metadata.plan ?? "" };
              }
              await applyFromSubscription(sub);
            }
          } catch {
            /* le retour navigateur et subscription.updated rattrapent */
          }
          // Récompense de parrainage éventuelle (filleul + parrain, une
          // seule fois : verrou referral_rewarded_at). Appelée AVANT le test
          // de redélivrance : si la récompense échoue au premier passage,
          // Stripe rejoue l'événement et elle doit être retentée.
          await maybeRewardReferral(s.metadata.coach_id);
          if (alreadyProcessed) break;
          // Puis email de bienvenue au coach (les renouvellements passent par
          // invoice.paid, sans re-email).
          try {
            const { data: coachAuth } = await supabase.auth.admin.getUserById(
              s.metadata.coach_id
            );
            if (coachAuth?.user?.email) {
              const { proWelcomeCoach } = await import("@/lib/email/templates");
              const { sendEmail } = await import("@/lib/email/resend");
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
        // Avoir pour la part remboursée (idempotent : la fonction n'émet que
        // la différence avec les avoirs déjà émis, y compris ceux créés par
        // nos propres routes d'annulation). Best-effort.
        try {
          const { data: payRow } = await supabase
            .from("payments")
            .select("id")
            .eq("stripe_charge_id", ch.id)
            .maybeSingle();
          if (payRow && refunded > 0) {
            const { data: noteId } = await supabase.rpc("create_credit_note", {
              p_payment: payRow.id,
              p_total_refunded_cents: refunded,
              p_reason: "Remboursement",
            });
            const { emailInvoice } = await import("@/lib/invoices/send");
            await emailInvoice(supabase, noteId as string | null);
          }
        } catch {
          /* la pièce comptable ne bloque pas la synchro */
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
          // dans la comptabilité (facture client, frais de transaction, CSV).
          // Idempotent via l'index unique sur stripe_payment_intent_id.
          if (
            sub.metadata?.kind === "client_sub" &&
            (invoice.amount_paid ?? 0) > 0
          ) {
            let { data: reg } = await supabase
              .from("client_subscriptions")
              .select("coach_id, client_id, service_id")
              .eq("stripe_subscription_id", sub.id)
              .maybeSingle();
            if (!reg) {
              // Première échéance arrivée AVANT checkout.session.completed
              // (ordre des webhooks non garanti) : on enregistre l'abonnement
              // depuis sa session Checkout, sinon cette échéance serait
              // perdue pour la comptabilité.
              try {
                const sessions = await stripe.checkout.sessions.list({
                  subscription: sub.id,
                  limit: 1,
                });
                const sessionId = sessions.data[0]?.id;
                if (sessionId) {
                  const { fulfillSubscriptionSession } = await import(
                    "@/lib/stripe/fulfillSubscription"
                  );
                  await fulfillSubscriptionSession(sessionId);
                  ({ data: reg } = await supabase
                    .from("client_subscriptions")
                    .select("coach_id, client_id, service_id")
                    .eq("stripe_subscription_id", sub.id)
                    .maybeSingle());
                }
              } catch {
                /* si l'enregistrement échoue, l'erreur ci-dessous fait rejouer */
              }
              if (!reg) throw new Error(`client_sub ${sub.id} introuvable`);
            }
            if (reg) {
              // Le taux d'une subscription Stripe est figé à sa création : si
              // le plan du coach a changé depuis, on réaligne la subscription
              // (5 % Essentiel, 3 % Pro) pour les échéances SUIVANTES. Le
              // taux réellement prélevé sur celle-ci est celui de la charge.
              // Best-effort.
              const currentFee =
                (
                  sub as Stripe.Subscription & {
                    application_fee_percent?: number | null;
                  }
                ).application_fee_percent ?? 0;
              let coachPlan = planOf(null);
              try {
                const { data: coachRow } = await supabase
                  .from("coaches")
                  .select("pro_until, pro_bonus_until")
                  .eq("id", reg.coach_id)
                  .maybeSingle();
                coachPlan = planOf(coachRow);
                const expectedFee = feeRatePercent(coachPlan);
                if (currentFee !== expectedFee) {
                  await stripe.subscriptions.update(sub.id, {
                    application_fee_percent: expectedFee,
                  });
                }
              } catch {
                /* réalignement raté : retenté à la prochaine échéance */
              }
              // Frais de transaction réellement prélevés (application fee de
              // la charge), moyen de paiement et frais Stripe (marge interne).
              // API 2025+ : la facture ne porte plus charge / payment_intent,
              // on passe par invoice.payments → PaymentIntent → latest_charge.
              let commission = 0;
              let chargeId: string | null = null;
              let subMethod: string | null = null;
              let subStripeFee = 0;
              let piId: string | null = null;
              try {
                const full = await stripe.invoices.retrieve(invoice.id as string, {
                  expand: ["payments"],
                });
                piId = invoicePaymentIntentId(full);
                if (piId) {
                  const pi = await stripe.paymentIntents.retrieve(piId, {
                    expand: ["latest_charge.balance_transaction"],
                  });
                  const ch =
                    pi.latest_charge && typeof pi.latest_charge !== "string"
                      ? pi.latest_charge
                      : null;
                  if (ch) {
                    chargeId = ch.id;
                    commission =
                      typeof ch.application_fee_amount === "number"
                        ? ch.application_fee_amount
                        : 0;
                    subMethod = ch.payment_method_details?.type ?? null;
                    const bt =
                      ch.balance_transaction && typeof ch.balance_transaction !== "string"
                        ? ch.balance_transaction
                        : null;
                    subStripeFee = bt?.fee ?? 0;
                  }
                }
              } catch {
                /* frais inconnus : 0 par défaut */
              }
              // Taux figé sur la ligne : celui réellement appliqué par Stripe
              // à cette échéance (la subscription peut encore porter l'ancien
              // taux jusqu'au réalignement ci-dessus). Le plan enregistré
              // est celui de CE taux, pas le plan courant du coach.
              const subRateBps =
                currentFee > 0
                  ? Math.round(currentFee * 100)
                  : feeRateBps(coachPlan);
              const linePlan = planForRateBps(subRateBps) ?? coachPlan;
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
                  plan: linePlan,
                  fee_rate_bps: subRateBps,
                  payment_method: subMethod,
                  stripe_fee_cents: subStripeFee,
                  // CGV acceptées à la souscription (version figée dans les
                  // métadonnées de l'abonnement Stripe).
                  terms_version: sub.metadata?.terms_version || null,
                  terms_accepted_at: sub.metadata?.terms_version
                    ? new Date((sub.created ?? 0) * 1000).toISOString()
                    : null,
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
  } catch (err) {
    // Événements MONÉTAIRES : une erreur de traitement laisserait la base
    // désynchronisée pour toujours (ex. refunded_cents jamais posé → le cron
    // verserait au coach de l'argent déjà rendu au client). On renvoie 500
    // pour que Stripe rejoue l'événement (les handlers sont idempotents).
    const monetary = new Set([
      // fulfill est idempotent (index unique sur le PaymentIntent) : un
      // échec ici sans retry = client débité sans réservation enregistrée.
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "charge.refunded",
      "charge.dispute.created",
      "charge.dispute.closed",
      "invoice.paid",
    ]);
    if (monetary.has(event.type)) {
      // Le fondateur est alerté (best-effort) : un webhook monétaire qui
      // échoue en boucle, c'est un client débité sans suite visible.
      if (process.env.FOUNDER_EMAIL) {
        try {
          const { founderAlert } = await import("@/lib/email/templates");
          const { sendEmail } = await import("@/lib/email/resend");
          const tpl = founderAlert({
            context: `Webhook Stripe en échec : ${event.type}`,
            details: [
              `event: ${event.id}`,
              err instanceof Error ? err.message : String(err),
              "Stripe va rejouer l'événement automatiquement.",
            ],
          });
          await sendEmail({
            to: process.env.FOUNDER_EMAIL,
            subject: tpl.subject,
            html: tpl.html,
          });
        } catch {
          /* l'alerte reste best-effort */
        }
      }
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
    // Les autres types restent en 200 : ils sont rattrapés au renouvellement
    // suivant / au retour de session, inutile que Stripe boucle dessus.
  }

  return NextResponse.json({ received: true });
}
