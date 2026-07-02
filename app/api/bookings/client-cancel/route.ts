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
      "id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status"
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  // Pas de paiement retenu : simple annulation.
  if (!payment || payment.escrow_status !== "held") {
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  const amount = payment.amount_cents;
  const refund = refundCents(
    normalizePolicy(coach?.cancellation_policy),
    new Date(booking.starts_at),
    amount
  );
  const breakdown = computePayout(
    amount,
    payment.stripe_fee_cents ?? 0,
    isPro(coach?.pro_until),
    refund
  );

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
      .update({
        escrow_status: refund >= amount ? "refunded" : "canceled",
        status: refund >= amount ? "refunded" : "paid",
        refunded_cents: refund,
        commission_cents: breakdown.commissionCents,
        payout_cents: breakdown.payoutCents,
        stripe_transfer_id: transferId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
