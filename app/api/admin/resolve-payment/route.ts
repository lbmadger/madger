import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { isPro } from "@/lib/subscription/plan";
import { isAdminEmail } from "@/lib/admin";

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
      "id, coach_id, booking_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status"
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
  const refund = Math.min(Math.max(0, Number(body.refund_cents) || 0), amount);

  const { data: coach } = await admin
    .from("coaches")
    .select("stripe_account_id, pro_until")
    .eq("id", payment.coach_id)
    .maybeSingle();

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
        { idempotencyKey: `resolve_refund_${payment.id}` }
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
          transfer_group: `coach_${payment.coach_id}`,
        },
        { idempotencyKey: `resolve_transfer_${payment.id}` }
      );
      transferId = transfer.id;
    }

    const fullyRefunded = refund >= amount;
    await admin
      .from("payments")
      .update({
        escrow_status: fullyRefunded ? "refunded" : "released",
        status: fullyRefunded ? "refunded" : "paid",
        refunded_cents: refund,
        commission_cents: breakdown.commissionCents,
        payout_cents: breakdown.payoutCents,
        stripe_transfer_id: transferId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (payment.booking_id) {
      await admin
        .from("bookings")
        .update({ status: fullyRefunded ? "cancelled" : "completed" })
        .eq("id", payment.booking_id);
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
