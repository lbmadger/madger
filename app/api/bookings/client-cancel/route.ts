import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { refundCents, normalizePolicy } from "@/lib/booking/cancellation";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import { refundClient } from "@/lib/email/templates";
import { detachMeetFromBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

// Annulation par le CLIENT (espace « Mes séances »). Le compte connecté doit
// correspondre (email) au client de la réservation. La formule d'annulation du
// coach s'applique : remboursement partiel au client, reste versé au coach.
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
  const bookingId = body.booking_id as string | undefined;
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);

  const { data: booking } = await admin
    .from("bookings")
    .select("id, coach_id, client_id, starts_at, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // La séance passée ne s'annule plus (elle se signale ou se note).
  if (new Date(booking.starts_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }

  // Vérifie que la réservation appartient bien au compte connecté (email).
  const { data: clientRow } = await admin
    .from("clients")
    .select("id, email")
    .eq("id", booking.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select(
      "stripe_account_id, pro_until, cancellation_policy, first_name, last_name"
    )
    .eq("id", booking.coach_id)
    .maybeSingle();

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status, stripe_payment_intent_id"
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  // Paiement gelé par un litige : rien ne bouge tant que l'admin n'a pas
  // tranché.
  if (payment?.escrow_status === "disputed") {
    return NextResponse.json({ error: "disputed" }, { status: 409 });
  }

  // Empreinte bancaire non débitée (demande pas encore acceptée par le
  // coach) : on libère l'autorisation, rien n'a été prélevé.
  if (payment?.escrow_status === "authorized") {
    const { data: claimed } = await admin
      .from("payments")
      .update({
        escrow_status: "canceled",
        status: "canceled",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("escrow_status", "authorized")
      .select("id");
    if (!claimed?.length) {
      return NextResponse.json({ error: "already_processed" }, { status: 409 });
    }
    try {
      if (payment.stripe_payment_intent_id) {
        await stripe.paymentIntents.cancel(
          payment.stripe_payment_intent_id as string,
          {},
          { idempotencyKey: `cancelauth_${payment.id}` }
        );
      }
    } catch {
      /* déjà annulée / expirée : sans effet */
    }
    await admin.from("pack_credits").delete().eq("payment_id", payment.id);
    await detachMeetFromBooking(admin, bookingId);
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  // Pas de paiement retenu : simple annulation.
  if (!payment || payment.escrow_status !== "held") {
    await detachMeetFromBooking(admin, bookingId);
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  const amount = payment.amount_cents;

  // Achat de PACK : remboursement au prorata des séances non consommées
  // (celle qu'on annule comprise), puis pack clôturé.
  const { data: pack } = await admin
    .from("pack_credits")
    .select("id, total, used")
    .eq("payment_id", payment.id)
    .maybeSingle();
  const baseAmount = pack
    ? Math.round(
        (amount * Math.max(0, pack.total - pack.used + 1)) / pack.total
      )
    : amount;

  const refund = refundCents(
    normalizePolicy(coach?.cancellation_policy),
    new Date(booking.starts_at),
    baseAmount
  );
  const breakdown = computePayout(
    amount,
    payment.stripe_fee_cents ?? 0,
    isPro(coach?.pro_until),
    refund
  );

  // Réclame le paiement AVANT les appels Stripe (anti-course avec le cron,
  // une annulation coach simultanée ou un double clic).
  const { data: claimed } = await admin
    .from("payments")
    .update({
      escrow_status: refund >= amount ? "refunded" : "canceled",
      status: refund >= amount ? "refunded" : "paid",
      refunded_cents: refund,
      commission_cents: breakdown.commissionCents,
      payout_cents: breakdown.payoutCents,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("escrow_status", "held")
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    if (refund > 0 && payment.stripe_charge_id) {
      await stripe.refunds.create(
        { charge: payment.stripe_charge_id, amount: refund },
        { idempotencyKey: `ccancel_refund_${payment.id}` }
      );
    }
    let transferId: string | null = null;
    if (
      breakdown.payoutCents > 0 &&
      coach?.stripe_account_id &&
      payment.stripe_charge_id
    ) {
      const transfer = await stripe.transfers.create(
        {
          amount: breakdown.payoutCents,
          currency: payment.currency || "eur",
          destination: coach.stripe_account_id,
          source_transaction: payment.stripe_charge_id,
          transfer_group: `coach_${booking.coach_id}`,
        },
        { idempotencyKey: `ccancel_transfer_${payment.id}` }
      );
      transferId = transfer.id;
    }

    await admin
      .from("payments")
      .update({ stripe_transfer_id: transferId })
      .eq("id", payment.id);

    await detachMeetFromBooking(admin, bookingId);
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    // Pack clôturé : plus aucun crédit utilisable après remboursement.
    if (pack) {
      await admin
        .from("pack_credits")
        .update({ used: pack.total })
        .eq("id", pack.id);
    }

    // Email de confirmation de remboursement (best-effort).
    if (refund > 0) {
      try {
        const tpl = refundClient({
          coachName:
            [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
            "Ton coach",
          refundStr: (refund / 100).toLocaleString("fr-FR", {
            style: "currency",
            currency: (payment.currency || "eur").toUpperCase(),
          }),
          reason: "cancellation",
        });
        await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
      } catch {
        /* best-effort */
      }
    }

    return NextResponse.json({
      ok: true,
      refunded_cents: refund,
      payout_cents: breakdown.payoutCents,
    });
  } catch (e) {
    // Échec Stripe après la réclamation : on rend la ligne (retraitable).
    await admin
      .from("payments")
      .update({ escrow_status: "held", status: "paid", resolved_at: null })
      .eq("id", payment.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
