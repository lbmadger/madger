import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { goodwillOpen } from "@/lib/booking/goodwill";
import { sendEmail } from "@/lib/email/resend";
import { refundClient } from "@/lib/email/templates";
import { emailInvoice } from "@/lib/invoices/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Geste commercial du COACH sur une séance ANNULÉE à l'unité : il rend au
// client ce qu'il a touché, c'est-à-dire le net après frais Madger (les frais
// de transaction restent acquis à Madger), dans les 7 jours qui suivent la
// séance. Deux cas selon où est l'argent :
//  - fonds encore sous séquestre (held) : remboursement depuis la plateforme,
//    le paiement est soldé (plus rien à verser au coach, la part Madger reste
//    sur la plateforme) ;
//  - fonds déjà versés au coach (transfert Stripe fait) : le montant est
//    repris sur le solde Stripe du coach (reversal) puis remboursé au client.
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
  // Seule une séance annulée se rembourse par geste : une séance qui a eu
  // lieu passe par le signalement du client (litige tranché par Madger).
  if (booking.status !== "cancelled") {
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }
  if (booking.pack_credit_id) {
    // Les packs ont leur propre geste (séance offerte, reste remboursé).
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }
  if (!goodwillOpen(booking.starts_at as string)) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
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
  // Le geste porte sur le net du coach : ce qu'il a touché ou allait toucher.
  const payoutNow = Math.max(0, (payment.payout_cents as number | null) ?? 0);
  const remaining = Math.min(payoutNow, Math.max(0, amount - alreadyRefunded));
  if (remaining <= 0) {
    return NextResponse.json({ error: "nothing_to_refund" }, { status: 409 });
  }
  const wanted = Number(body.amount_cents);
  const refund =
    Number.isFinite(wanted) && wanted > 0 ? Math.min(Math.round(wanted), remaining) : remaining;
  const totalRefunded = alreadyRefunded + refund;

  // Déjà versé au coach ? Le montant est repris sur son solde Stripe.
  const transferId = payment.stripe_transfer_id as string | null;
  const transferred = !!transferId && payment.escrow_status !== "held";

  // Réclame le paiement avant Stripe (anti double clic / course avec le cron).
  const { data: claimed } = await admin
    .from("payments")
    .update({ refunded_cents: totalRefunded, payout_cents: payoutNow - refund })
    .eq("id", payment.id)
    .eq("refunded_cents", alreadyRefunded)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    if (transferred && transferId) {
      await stripe.transfers.createReversal(
        transferId,
        { amount: refund },
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
      .update({ refunded_cents: alreadyRefunded, payout_cents: payoutNow })
      .eq("id", payment.id)
      .eq("refunded_cents", totalRefunded);
    return NextResponse.json(
      { error: "stripe_error", detail: e instanceof Error ? e.message : undefined },
      { status: 500 }
    );
  }

  // Fonds encore sous séquestre : le paiement est soldé ici, le cron de
  // versement n'y touche plus (la part Madger reste sur la plateforme).
  if (!transferred) {
    await admin
      .from("payments")
      .update({ escrow_status: "canceled", resolved_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("escrow_status", "held");
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

  return NextResponse.json({ ok: true, refunded_cents: refund, reversed_cents: transferred ? refund : 0 });
}
