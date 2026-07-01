import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { refundCents, normalizePolicy } from "@/lib/booking/cancellation";
import { isPro } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

// Annulation d'une séance par le coach (depuis l'agenda).
//  - by = "coach"  → séance annulée par le coach : client remboursé à 100 %.
//  - by = "client" → annulation à la demande du client : la formule d'annulation
//    du coach s'applique (il conserve une part selon le délai).
// Le remboursement et le versement de la part restante au coach sont exécutés
// immédiatement (pas d'attente). Impossible si les fonds sont déjà libérés ou
// gelés par un litige.
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
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  const by = body.by === "coach" ? "coach" : "client";
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);

  // Séance du coach connecté (RLS via user.id) + paiement retenu associé.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, coach_id, starts_at, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select("stripe_account_id, pro_until, cancellation_policy")
    .eq("id", user.id)
    .maybeSingle();

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status"
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  // Pas de paiement retenu : simple annulation de la séance.
  if (!payment || payment.escrow_status !== "held") {
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  const amount = payment.amount_cents;
  const refund =
    by === "coach"
      ? amount // annulation coach → remboursement intégral
      : refundCents(
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
        { idempotencyKey: `cancel_refund_${payment.id}` }
      );
    }
    let transferId: string | null = null;
    if (breakdown.payoutCents > 0 && coach?.stripe_account_id && payment.stripe_charge_id) {
      const transfer = await stripe.transfers.create(
        {
          amount: breakdown.payoutCents,
          currency: payment.currency || "eur",
          destination: coach.stripe_account_id,
          source_transaction: payment.stripe_charge_id,
          transfer_group: `coach_${user.id}`,
        },
        { idempotencyKey: `cancel_transfer_${payment.id}` }
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

    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

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
