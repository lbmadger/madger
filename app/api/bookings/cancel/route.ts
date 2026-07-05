import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { refundCents, normalizePolicy } from "@/lib/booking/cancellation";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import { refundClient, bookingCancelledClient } from "@/lib/email/templates";
import { detachMeetFromBooking } from "@/lib/google/calendar";

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
  // Défaut sûr : annulation par le coach → remboursement intégral. La retenue
  // (formule d'annulation) ne s'applique que si le coach indique explicitement
  // agir à la demande du client.
  const by = body.by === "client" ? "client" : "coach";
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);

  // Séance du coach connecté (RLS via user.id) + paiement retenu associé.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, coach_id, client_id, starts_at, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select("stripe_account_id, pro_until, cancellation_policy, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, client_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status, stripe_payment_intent_id"
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  // Paiement gelé par un litige : rien ne bouge tant que l'admin n'a pas
  // tranché (ni annulation, ni remboursement).
  if (payment?.escrow_status === "disputed") {
    return NextResponse.json({ error: "disputed" }, { status: 409 });
  }

  // Empreinte bancaire non débitée (demande pas encore acceptée) : on libère
  // simplement l'autorisation, rien n'a été prélevé au client.
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
    // Pack acheté avec cette empreinte : crédits jamais activés.
    await admin
      .from("pack_credits")
      .delete()
      .eq("payment_id", payment.id);
    await detachMeetFromBooking(admin, bookingId);
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    try {
      const { data: client } = await admin
        .from("clients")
        .select("email")
        .eq("id", payment.client_id)
        .maybeSingle();
      if (client?.email) {
        const tpl = bookingCancelledClient({
          coachName:
            [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
            "Ton coach",
          dateStr: new Date(booking.starts_at).toLocaleString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          }),
          declined: true,
        });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
      }
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  // Pas de paiement retenu : simple annulation de la séance, mais on prévient
  // le client par email (sinon il attend une réponse qui ne vient jamais).
  if (!payment || payment.escrow_status !== "held") {
    const wasPending = booking.status === "pending";
    await detachMeetFromBooking(admin, bookingId);
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    try {
      if (booking.client_id) {
        const { data: client } = await admin
          .from("clients")
          .select("email")
          .eq("id", booking.client_id)
          .maybeSingle();
        if (client?.email) {
          const tpl = bookingCancelledClient({
            coachName:
              [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
              "Ton coach",
            dateStr: new Date(booking.starts_at).toLocaleString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            }),
            declined: wasPending,
          });
          await sendEmail({
            to: client.email,
            subject: tpl.subject,
            html: tpl.html,
          });
        }
      }
    } catch {
      /* email best-effort */
    }
    return NextResponse.json({ ok: true, refunded_cents: 0 });
  }

  const amount = payment.amount_cents;

  // Achat de PACK : le remboursement porte sur les séances non consommées
  // (la séance annulée comprise) et le pack est clôturé après annulation.
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

  const refund =
    by === "coach"
      ? baseAmount // annulation coach → remboursement intégral du non consommé
      : refundCents(
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

  // Réclame le paiement AVANT les appels Stripe : si une autre annulation, le
  // cron ou l'admin traite la même ligne en même temps, un seul gagne.
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
      .update({ stripe_transfer_id: transferId })
      .eq("id", payment.id);

    await detachMeetFromBooking(admin, bookingId);
    await supabase
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

    // Email de remboursement au client (best-effort).
    if (refund > 0) {
      try {
        const { data: client } = await admin
          .from("clients")
          .select("email")
          .eq("id", payment.client_id)
          .maybeSingle();
        if (client?.email) {
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
          await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        }
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
