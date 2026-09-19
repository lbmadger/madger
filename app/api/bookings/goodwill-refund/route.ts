import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout, coachBearsStripeFee } from "@/lib/stripe/escrow";
import { sendEmail } from "@/lib/email/resend";
import { refundClient } from "@/lib/email/templates";
import { emailInvoice } from "@/lib/invoices/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Geste commercial du COACH sur une séance à l'unité : il rembourse au client
// tout ou partie de ce qui a été conservé (annulation tardive, no-show,
// séance décevante). Deux cas selon où est l'argent :
//  - fonds encore sous séquestre (held) : remboursement depuis la plateforme,
//    le versement à venir est recalculé ;
//  - fonds déjà versés au coach (transfert Stripe fait) : la part versée est
//    reprise sur le solde Stripe du coach (reversal), Madger rend ses frais
//    de transaction, et le client est remboursé depuis la plateforme.
// Avoir émis et envoyé, client prévenu par email.
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
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey, NO_STORE);
  const { data: booking } = await admin
    .from("bookings")
    .select("id, coach_id, client_id, starts_at, status, pack_credit_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (booking.pack_credit_id) {
    // Les packs ont leur propre geste (séance offerte, reste remboursé).
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount_cents, currency, status, escrow_status, stripe_charge_id, stripe_transfer_id, stripe_fee_cents, payment_method, released_cents, refunded_cents, commission_cents, payout_cents, fee_rate_bps"
    )
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (!payment?.stripe_charge_id) {
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }
  if (payment.escrow_status === "disputed") {
    return NextResponse.json({ error: "disputed" }, { status: 409 });
  }
  if (payment.escrow_status === "authorized") {
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }

  const amount = payment.amount_cents as number;
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
  const remaining = Math.max(0, amount - alreadyRefunded);
  if (remaining <= 0) {
    return NextResponse.json({ error: "nothing_to_refund" }, { status: 409 });
  }
  const wanted = Number(body.amount_cents);
  const refund =
    Number.isFinite(wanted) && wanted > 0 ? Math.min(Math.round(wanted), remaining) : remaining;
  const totalRefunded = alreadyRefunded + refund;

  // Déjà versé au coach ? La part versée (payout) est reprise sur son solde.
  const transferId = payment.stripe_transfer_id as string | null;
  const transferred = !!transferId && payment.escrow_status !== "held";
  const payoutNow = (payment.payout_cents as number | null) ?? 0;
  const reversal = transferred ? Math.min(refund, Math.max(0, payoutNow)) : 0;

  // Réclame le paiement avant Stripe (anti double clic / course avec le cron).
  const { data: claimed } = await admin
    .from("payments")
    .update({ refunded_cents: totalRefunded })
    .eq("id", payment.id)
    .eq("refunded_cents", alreadyRefunded)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    if (reversal > 0 && transferId) {
      await stripe.transfers.createReversal(
        transferId,
        { amount: reversal },
        { idempotencyKey: `goodwill_rev_${payment.id}_${totalRefunded}` }
      );
    }
    await stripe.refunds.create(
      { charge: payment.stripe_charge_id as string, amount: refund },
      { idempotencyKey: `goodwill_refund_${payment.id}_${totalRefunded}` }
    );
  } catch (e) {
    await admin
      .from("payments")
      .update({ refunded_cents: alreadyRefunded })
      .eq("id", payment.id)
      .eq("refunded_cents", totalRefunded);
    return NextResponse.json(
      { error: "stripe_error", detail: e instanceof Error ? e.message : undefined },
      { status: 500 }
    );
  }

  // Comptes du paiement après le geste.
  const full = totalRefunded >= amount;
  if (transferred) {
    // Le coach rend sa part, Madger rend ses frais sur la part remboursée.
    const commissionNow = (payment.commission_cents as number | null) ?? 0;
    await admin
      .from("payments")
      .update({
        payout_cents: Math.max(0, payoutNow - reversal),
        commission_cents: Math.max(0, commissionNow - (refund - reversal)),
        ...(full
          ? { escrow_status: "refunded", status: "refunded", resolved_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", payment.id);
  } else {
    // Encore sous séquestre : le versement à venir suit le montant conservé.
    const breakdown = computePayout({
      amountCents: amount,
      feeRateBps: (payment.fee_rate_bps as number | null) ?? 700,
      stripeFeeCents: (payment.stripe_fee_cents as number | null) ?? 0,
      coachBearsStripeFee: coachBearsStripeFee(payment.payment_method as string | null),
      refundCents: totalRefunded,
    });
    await admin
      .from("payments")
      .update({
        commission_cents: breakdown.commissionCents,
        payout_cents: breakdown.payoutCents,
        ...(full
          ? { escrow_status: "refunded", status: "refunded", resolved_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", payment.id);
  }

  // Avoir + email au client (best-effort : l'argent est déjà parti).
  try {
    const { data: noteId } = await admin.rpc("create_credit_note", {
      p_payment: payment.id,
      p_total_refunded_cents: totalRefunded,
      p_reason: "Geste commercial du coach",
    });
    await emailInvoice(admin, noteId as string | null);
  } catch {
    /* best-effort */
  }
  try {
    const [{ data: client }, { data: coach }] = await Promise.all([
      admin.from("clients").select("email").eq("id", booking.client_id).maybeSingle(),
      admin.from("coaches").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    ]);
    if (client?.email) {
      const tpl = refundClient({
        coachName:
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach",
        refundStr: (refund / 100).toLocaleString("fr-FR", {
          style: "currency",
          currency: ((payment.currency as string) || "eur").toUpperCase(),
        }),
        reason: "gesture",
      });
      await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, refunded_cents: refund, reversed_cents: reversal });
}
