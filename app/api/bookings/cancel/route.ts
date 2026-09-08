import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout, coachBearsStripeFee } from "@/lib/stripe/escrow";
import {
  refundCents,
  resolveRefundPolicy,
  clampCancelHours,
  creditRestoredIfCancelled,
} from "@/lib/booking/cancellation";
import { planOf, feeRateBps } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import { notifyClient } from "@/lib/notifications/client";
import {
  refundClient,
  bookingCancelledClient,
  cancellationNoRefundClient,
  creditCancellationClient,
} from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
import { detachMeetFromBooking } from "@/lib/google/calendar";
import { emailInvoice } from "@/lib/invoices/send";
import { ensureStripeFee } from "@/lib/stripe/fees";
import { packProrata, packRefundableUnits, packPaidTotal } from "@/lib/packs/prorata";

export const dynamic = "force-dynamic";
// Refund + transfert Stripe + agenda Google + email en série : la limite de
// 10 s par défaut peut couper la fonction après que l'argent a bougé.
export const maxDuration = 30;

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
    .select("id, coach_id, client_id, starts_at, status, pack_credit_id")
    .eq("id", bookingId)
    .maybeSingle();
  // Déjà annulée : refusé net. Un second appel retombait dans la branche
  // « aucun paiement retenu » et envoyait au client un email contradictoire.
  if (booking?.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled" }, { status: 409 });
  }
  if (!booking || booking.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select(
      "stripe_account_id, pro_until, pro_bonus_until, cancellation_policy, refund_over_24h_pct, refund_under_24h_pct, cancel_hours, first_name, last_name, timezone"
    )
    .eq("id", user.id)
    .maybeSingle();

  // ── Séance sur PACK d'une séance CONFIRMÉE ───────────────────────────────
  // Lot 2 : le coach n'annule qu'une séance, le pack continue et rien n'est
  // remboursé ici. Annulation par le coach → crédit rendu ; à la demande du
  // client → règle du délai du pack (rendu avant, perdu après). Le refus
  // d'une demande EN ATTENTE (première séance d'un pack en mode approbation)
  // reste traité plus bas : remboursement intégral et pack clôturé.
  if (booking.pack_credit_id && booking.status === "confirmed") {
    const { data: pack } = await admin
      .from("pack_credits")
      .select("id, cancel_hours")
      .eq("id", booking.pack_credit_id)
      .maybeSingle();
    const hours = clampCancelHours(pack?.cancel_hours);
    const restored =
      by === "coach" || creditRestoredIfCancelled(hours, new Date(booking.starts_at));
    if (!restored) {
      await admin.rpc("pack_credit_restore", {
        p_booking: bookingId,
        p_actor: "coach",
        p_lost: true,
        p_note: `Annulation à la demande du client à moins de ${hours} h`,
      });
    }
    await detachMeetFromBooking(admin, bookingId);
    const { data: cancelled } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .neq("status", "cancelled")
      .select("id");
    if (!cancelled?.length) {
      return NextResponse.json({ error: "already_processed" }, { status: 409 });
    }
    try {
      const { data: client } = await admin
        .from("clients")
        .select("email")
        .eq("id", booking.client_id)
        .maybeSingle();
      if (client?.email) {
        const coachName =
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
          "Ton coach";
        const dateStr = new Date(booking.starts_at).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: coach?.timezone || "Europe/Paris",
        });
        const tpl =
          by === "coach"
            ? bookingCancelledClient({ coachName, dateStr, declined: false })
            : creditCancellationClient({
                coachName,
                dateStr,
                restored,
                hours,
                spaceUrl: `${APP_URL}/espace`,
              });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        if (by === "coach") {
          await notifyClient(admin, {
            email: client.email,
            type: "cancelled",
            coachName,
            startsAt: booking.starts_at as string,
            bookingId,
          });
        }
      }
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: true, refunded_cents: 0, credit_restored: restored });
  }

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, client_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, escrow_status, stripe_payment_intent_id, released_cents, refunded_cents, commission_cents, payout_cents, fee_rate_bps, payment_method, provider_fee_cents"
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
    // Pack acheté avec cette empreinte : crédits jamais activés, pack
    // clôturé et journalisé (aucune écriture directe sur pack_credits).
    {
      const { data: authPack } = await admin
        .from("pack_credits")
        .select("id")
        .eq("payment_id", payment.id)
        .maybeSingle();
      if (authPack) {
        await admin.rpc("close_pack_credit", {
          p_pack: authPack.id,
          p_status: "closed",
          p_actor: "system",
          p_note: "Empreinte bancaire annulée, pack jamais activé",
        });
      }
    }
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
            timeZone: coach?.timezone || "Europe/Paris",
          }),
          declined: true,
        });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        await notifyClient(admin, {
          email: client.email,
          type: "declined",
          coachName: [coach?.first_name, coach?.last_name].filter(Boolean).join(" "),
          startsAt: booking.starts_at as string,
          bookingId,
        });
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
              timeZone: coach?.timezone || "Europe/Paris",
            }),
            declined: wasPending,
          });
          await sendEmail({
            to: client.email,
            subject: tpl.subject,
            html: tpl.html,
          });
          await notifyClient(admin, {
            email: client.email,
            type: wasPending ? "declined" : "cancelled",
            coachName: [coach?.first_name, coach?.last_name].filter(Boolean).join(" "),
            startsAt: booking.starts_at as string,
            bookingId,
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
    .select("id, total, paid_total, used, status")
    .eq("payment_id", payment.id)
    .maybeSingle();
  // Prorata sur les séances PAYÉES (les séances offertes ne valent rien).
  const baseAmount = pack
    ? packProrata(
        amount,
        packRefundableUnits(pack.total, pack.used, pack.paid_total as number | null, true),
        packPaidTotal(pack.total, pack.paid_total as number | null)
      )
    : amount;

  // Part déjà transférée au coach (packs libérés séance par séance) et part
  // déjà remboursée (refund partiel externe synchronisé par le webhook) :
  // plus remboursables ni re-transférables, sinon la somme sortante
  // dépasserait le montant encaissé.
  const alreadyReleased = (payment.released_cents as number | null) ?? 0;
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;

  const refundWanted =
    by === "coach"
      ? baseAmount // annulation coach → remboursement intégral du non consommé
      : refundCents(
          resolveRefundPolicy(coach),
          new Date(booking.starts_at),
          baseAmount
        );
  const refund = Math.min(
    refundWanted,
    Math.max(0, amount - alreadyReleased - alreadyRefunded)
  );
  const totalRefunded = alreadyRefunded + refund;

  const feeCents = await ensureStripeFee(admin, stripe, {
    id: payment.id as string,
    stripe_charge_id: payment.stripe_charge_id as string | null,
    stripe_fee_cents: payment.stripe_fee_cents as number | null,
  });
  // Taux figé au paiement (migration 0064), jamais le plan courant.
  const breakdown = computePayout({
    amountCents: amount,
    feeRateBps:
      (payment.fee_rate_bps as number | null) ?? feeRateBps(planOf(coach)),
    stripeFeeCents: feeCents,
    coachBearsStripeFee: coachBearsStripeFee(payment.payment_method as string | null),
    refundCents: totalRefunded,
  });

  // Réclame le paiement AVANT les appels Stripe : si une autre annulation, le
  // cron ou l'admin traite la même ligne en même temps, un seul gagne.
  const { data: claimed } = await admin
    .from("payments")
    .update({
      escrow_status: totalRefunded >= amount ? "refunded" : "canceled",
      status: totalRefunded >= amount ? "refunded" : "paid",
      refunded_cents: totalRefunded,
      commission_cents: breakdown.commissionCents,
      provider_fee_cents: breakdown.providerFeeCents,
      payout_cents: breakdown.payoutCents,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("escrow_status", "held")
    // Un remboursement externe (webhook) arrivé entre la lecture et la
    // réclamation invalide les montants calculés.
    .eq("refunded_cents", alreadyRefunded)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    if (refund > 0 && payment.stripe_charge_id) {
      // Le montant fait partie de la clé : un retry avec un montant différent
      // (fenêtre des 24 h franchie entre-temps) ne déclenche pas
      // d'idempotency_error Stripe qui bloquerait la résolution 24 h.
      await stripe.refunds.create(
        { charge: payment.stripe_charge_id, amount: refund },
        { idempotencyKey: `cancel_refund_${payment.id}_${refund}` }
      );
    }
    let transferId: string | null = null;
    const cancelTransfer = Math.max(0, breakdown.payoutCents - alreadyReleased);
    if (cancelTransfer > 0 && coach?.stripe_account_id && payment.stripe_charge_id) {
      const transfer = await stripe.transfers.create(
        {
          amount: cancelTransfer,
          currency: payment.currency || "eur",
          destination: coach.stripe_account_id,
          source_transaction: payment.stripe_charge_id,
          transfer_group: `coach_${user.id}`,
        },
        { idempotencyKey: `cancel_transfer_${payment.id}_${cancelTransfer}` }
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

    // Pack clôturé (journalisé) : plus aucun crédit utilisable après
    // remboursement. Avoir émis pour la part remboursée (best-effort : la
    // pièce comptable ne doit jamais annuler un remboursement déjà parti).
    try {
      if (pack && pack.status === "active") {
        await admin.rpc("close_pack_credit", {
          p_pack: pack.id,
          p_status: "refunded",
          p_actor: "coach",
          p_note:
            by === "coach"
              ? "Pack refusé ou annulé par le coach"
              : "Pack annulé à la demande du client",
        });
      }
      if (refund > 0) {
        const { data: noteId } = await admin.rpc("create_credit_note", {
          p_payment: payment.id,
          p_total_refunded_cents: totalRefunded,
          p_reason:
            by === "coach"
              ? "Annulation par le coach"
              : "Annulation à la demande du client",
        });
        await emailInvoice(admin, noteId as string | null);
      }
    } catch {
      /* best-effort */
    }

    // Email au client (best-effort) : remboursement s'il y a lieu, sinon
    // annulation actée SANS remboursement (annulation tardive, formule du
    // coach), pour qu'il ne reste jamais sans réponse.
    try {
      const { data: client } = await admin
        .from("clients")
        .select("email")
        .eq("id", payment.client_id)
        .maybeSingle();
      if (client?.email) {
        const coachName =
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
          "Ton coach";
        const tpl =
          refund > 0
            ? refundClient({
                coachName,
                refundStr: (refund / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: (payment.currency || "eur").toUpperCase(),
                }),
                reason: "cancellation",
              })
            : cancellationNoRefundClient({
                coachName,
                dateStr: new Date(booking.starts_at).toLocaleString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: coach?.timezone || "Europe/Paris",
                }),
              });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        // Cloche in-app : seulement quand le COACH annule (le client qui
        // annule lui-même n'a pas besoin d'en être notifié).
        if (by === "coach") {
          await notifyClient(admin, {
            email: client.email,
            type: "cancelled",
            coachName,
            startsAt: booking.starts_at as string,
            bookingId,
          });
        }
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
    // Échec Stripe après la réclamation : on rend la ligne (retraitable),
    // montants compris. Sans ce revert complet, la base affirmerait qu'un
    // remboursement raté a eu lieu et le cron finaliserait sur des chiffres
    // faux.
    await admin
      .from("payments")
      .update({
        escrow_status: "held",
        status: "paid",
        resolved_at: null,
        refunded_cents: alreadyRefunded,
        commission_cents: (payment.commission_cents as number | null) ?? 0,
        provider_fee_cents: (payment.provider_fee_cents as number | null) ?? 0,
        payout_cents: (payment.payout_cents as number | null) ?? null,
      })
      .eq("id", payment.id)
      // Conditionnel : n'écrase jamais une écriture concurrente (webhook
      // charge.refunded externe) arrivée entre le claim et ce revert.
      .eq("escrow_status", totalRefunded >= amount ? "refunded" : "canceled");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
