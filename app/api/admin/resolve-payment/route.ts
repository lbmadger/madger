import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { isPro } from "@/lib/subscription/plan";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  disputeResolvedClient,
  disputeResolvedCoach,
} from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export const dynamic = "force-dynamic";

// Résolution d'un litige par un admin (cf. charte). L'admin fixe le montant
// remboursé au client (refund_cents) ; le reste, moins frais Stripe et
// commission, est versé au coach. Exécuté immédiatement.
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
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const paymentId = body.payment_id as string | undefined;
  if (!paymentId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, coach_id, client_id, booking_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status, released_cents, refunded_cents, commission_cents, payout_cents"
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (payment.escrow_status !== "disputed" && payment.escrow_status !== "held") {
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  }

  const amount = payment.amount_cents;
  const alreadyReleased = (payment.released_cents as number | null) ?? 0;
  // Part déjà remboursée (refund partiel externe synchronisé par le
  // webhook) : non re-remboursable, sinon la somme sortante dépasse
  // l'encaissé.
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
  const refund = Math.min(
    Math.max(0, Number(body.refund_cents) || 0),
    Math.max(0, amount - alreadyReleased - alreadyRefunded)
  );
  const totalRefunded = alreadyRefunded + refund;

  const { data: coach } = await admin
    .from("coaches")
    .select("stripe_account_id, pro_until")
    .eq("id", payment.coach_id)
    .maybeSingle();

  const breakdown = computePayout(
    amount,
    payment.stripe_fee_cents ?? 0,
    isPro(coach?.pro_until),
    totalRefunded
  );

  // Réclame la ligne AVANT tout appel Stripe (même patron que cancel/release) :
  // un seul processus gagne. Empêche le double traitement resolve + cron sur
  // une ligne encore `held`.
  const fullyRefunded = totalRefunded >= amount;
  const previousStatus = payment.escrow_status as string;
  const { data: claimed } = await admin
    .from("payments")
    .update({
      escrow_status: fullyRefunded ? "refunded" : "released",
      status: fullyRefunded ? "refunded" : "paid",
      refunded_cents: totalRefunded,
      commission_cents: breakdown.commissionCents,
      payout_cents: breakdown.payoutCents,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("escrow_status", previousStatus)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  }

  try {
    if (refund > 0 && payment.stripe_charge_id) {
      await stripe.refunds.create(
        { charge: payment.stripe_charge_id, amount: refund },
        { idempotencyKey: `resolve_refund_${payment.id}_${refund}` }
      );
    }
    let transferId: string | null = null;
    const resolveTransfer = Math.max(0, breakdown.payoutCents - alreadyReleased);
    if (
      resolveTransfer > 0 &&
      coach?.stripe_account_id &&
      payment.stripe_charge_id
    ) {
      const transfer = await stripe.transfers.create(
        {
          amount: resolveTransfer,
          currency: payment.currency || "eur",
          destination: coach.stripe_account_id,
          source_transaction: payment.stripe_charge_id,
          transfer_group: `coach_${payment.coach_id}`,
        },
        { idempotencyKey: `resolve_transfer_${payment.id}_${resolveTransfer}` }
      );
      transferId = transfer.id;
    }
    if (transferId) {
      await admin
        .from("payments")
        .update({ stripe_transfer_id: transferId })
        .eq("id", payment.id);
    }

    if (payment.booking_id) {
      await admin
        .from("bookings")
        .update({ status: fullyRefunded ? "cancelled" : "completed" })
        .eq("id", payment.booking_id);
    }

    // La décision est notifiée aux deux parties (best-effort).
    try {
      // Montants formatés selon la langue du destinataire (client FR, coach
      // FR ou EN).
      const euros = (c: number, loc: "fr" | "en" = "fr") =>
        (c / 100).toLocaleString(loc === "en" ? "en-GB" : "fr-FR", {
          style: "currency",
          currency: (payment.currency || "eur").toUpperCase(),
        });
      const { data: clientRow } = await admin
        .from("clients")
        .select("email, first_name, last_name")
        .eq("id", payment.client_id)
        .maybeSingle();
      const { data: coachRow } = await admin
        .from("coaches")
        .select("first_name, last_name, locale")
        .eq("id", payment.coach_id)
        .maybeSingle();
      const coachLocale = coachRow?.locale === "en" ? ("en" as const) : ("fr" as const);
      // Le client est TOUJOURS informé de la décision, remboursé ou non :
      // un signalement rejeté sans réponse laisserait le dossier ouvert
      // pour lui.
      if (clientRow?.email) {
        const tpl = disputeResolvedClient({
          refunded: refund > 0,
          refundStr: refund > 0 ? euros(refund) : null,
        });
        await sendEmail({
          to: clientRow.email,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: "contact@madger.app",
        });
      }
      const { data: coachAuth } = await admin.auth.admin.getUserById(
        payment.coach_id as string
      );
      if (coachAuth?.user?.email) {
        const tpl = disputeResolvedCoach({
          locale: coachLocale,
          clientName:
            [clientRow?.first_name, clientRow?.last_name]
              .filter(Boolean)
              .join(" ") ||
            (coachLocale === "en" ? "your client" : "ton client"),
          payoutStr:
            breakdown.payoutCents > 0
              ? euros(breakdown.payoutCents, coachLocale)
              : null,
          refundStr: refund > 0 ? euros(refund, coachLocale) : null,
          dashboardUrl: `${APP_URL}/dashboard/paiements`,
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

    return NextResponse.json({
      ok: true,
      refunded_cents: refund,
      payout_cents: breakdown.payoutCents,
    });
  } catch (e) {
    // Échec Stripe après le claim : on rend la ligne à son état d'origine
    // pour qu'elle reste visible et re-traitable (les idempotency keys
    // protègent d'un double refund/transfer au rejeu).
    await admin
      .from("payments")
      .update({
        escrow_status: previousStatus,
        status: "paid",
        resolved_at: null,
        refunded_cents: alreadyRefunded,
        commission_cents: (payment.commission_cents as number | null) ?? 0,
        payout_cents: (payment.payout_cents as number | null) ?? null,
      })
      .eq("id", payment.id)
      .eq("escrow_status", fullyRefunded ? "refunded" : "released");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
