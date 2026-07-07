import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { refundCents, resolveRefundPolicy } from "@/lib/booking/cancellation";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import {
  refundClient,
  bookingCancelledCoach,
} from "@/lib/email/templates";
import { detachMeetFromBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
// Refund + transfert Stripe + agenda Google + emails en série : la limite
// de 10 s par défaut peut couper la fonction après que l'argent a bougé.
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

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
    .select("id, email, first_name, last_name")
    .eq("id", booking.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }


  // Prévient le coach que son créneau se libère (best-effort, jamais
  // bloquant). Appelé sur chaque chemin d'annulation réussi.
  async function notifyCoachCancelled(refunded: number, kept: number) {
    if (!booking) return;
    try {
      const { data: coachAuth } = await admin.auth.admin.getUserById(
        booking.coach_id as string
      );
      const coachEmail = coachAuth?.user?.email;
      if (!coachEmail) return;
      const euros = (c: number) =>
        (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
      const tpl = bookingCancelledCoach({
        locale: coach?.locale === "en" ? "en" : "fr",
        clientName:
          [clientRow?.first_name, clientRow?.last_name]
            .filter(Boolean)
            .join(" ") || "Ton client",
        dateStr: new Date(booking.starts_at).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        }),
        refundStr: refunded > 0 ? euros(refunded) : null,
        keptStr: kept > 0 ? euros(kept) : null,
        dashboardUrl: `${APP_URL}/dashboard/agenda`,
      });
      await sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html });
    } catch {
      /* best-effort */
    }
  }

  const { data: coach } = await admin
    .from("coaches")
    .select(
      "stripe_account_id, pro_until, cancellation_policy, refund_over_24h_pct, refund_under_24h_pct, first_name, last_name, locale"
    )
    .eq("id", booking.coach_id)
    .maybeSingle();

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status, stripe_payment_intent_id, released_cents, refunded_cents, commission_cents, payout_cents"
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
    await notifyCoachCancelled(0, 0);
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  // Pas de paiement retenu : simple annulation.
  if (!payment || payment.escrow_status !== "held") {
    await detachMeetFromBooking(admin, bookingId);
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    await notifyCoachCancelled(0, 0);
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

  // Part déjà transférée au coach (packs libérés séance par séance) et part
  // déjà remboursée (refund partiel externe synchronisé par le webhook) :
  // plus remboursables, sinon la somme sortante dépasserait l'encaissé.
  const alreadyReleased = (payment.released_cents as number | null) ?? 0;
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
  const refund = Math.min(
    refundCents(
      resolveRefundPolicy(coach),
      new Date(booking.starts_at),
      baseAmount
    ),
    Math.max(0, amount - alreadyReleased - alreadyRefunded)
  );
  const totalRefunded = alreadyRefunded + refund;
  const breakdown = computePayout(
    amount,
    payment.stripe_fee_cents ?? 0,
    isPro(coach?.pro_until),
    totalRefunded
  );

  // Réclame le paiement AVANT les appels Stripe (anti-course avec le cron,
  // une annulation coach simultanée ou un double clic).
  const { data: claimed } = await admin
    .from("payments")
    .update({
      escrow_status: totalRefunded >= amount ? "refunded" : "canceled",
      status: totalRefunded >= amount ? "refunded" : "paid",
      refunded_cents: totalRefunded,
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
        { idempotencyKey: `ccancel_refund_${payment.id}_${refund}` }
      );
    }
    let transferId: string | null = null;
    const cancelTransfer = Math.max(0, breakdown.payoutCents - alreadyReleased);
    if (
      cancelTransfer > 0 &&
      coach?.stripe_account_id &&
      payment.stripe_charge_id
    ) {
      const transfer = await stripe.transfers.create(
        {
          amount: cancelTransfer,
          currency: payment.currency || "eur",
          destination: coach.stripe_account_id,
          source_transaction: payment.stripe_charge_id,
          transfer_group: `coach_${booking.coach_id}`,
        },
        { idempotencyKey: `ccancel_transfer_${payment.id}_${cancelTransfer}` }
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

    await notifyCoachCancelled(refund, breakdown.payoutCents);

    return NextResponse.json({
      ok: true,
      refunded_cents: refund,
      payout_cents: breakdown.payoutCents,
    });
  } catch (e) {
    // Échec Stripe après la réclamation : on rend la ligne (retraitable),
    // montants compris, sinon la base affirmerait qu'un remboursement raté
    // a eu lieu.
    await admin
      .from("payments")
      .update({
        escrow_status: "held",
        status: "paid",
        resolved_at: null,
        refunded_cents: alreadyRefunded,
        commission_cents: (payment.commission_cents as number | null) ?? 0,
        payout_cents: (payment.payout_cents as number | null) ?? null,
      })
      .eq("id", payment.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
