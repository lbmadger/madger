import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { notifyClient } from "@/lib/notifications/client";
import { refundClient, bookingCancelledClient } from "@/lib/email/templates";
import { emailInvoice } from "@/lib/invoices/send";
import { detachMeetFromBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
// Un remboursement Stripe par participant : marge large.
export const maxDuration = 60;

// Le COACH annule un cours collectif entier : chaque participant est
// remboursé à 100 % de ce qui n'a pas déjà été rendu (le coach est en
// cause), sa place passe en « annulée », un avoir est émis et il est prévenu.
// Les places sur crédit de pack (lot 2) récupèrent leur crédit.
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
  const sessionId = body.group_session_id as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  // Réclamé AVANT tout remboursement : un double clic ne rembourse pas deux
  // fois, et un cours déjà annulé ne bouge plus.
  const { data: claimed } = await admin
    .from("group_sessions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("coach_id", user.id)
    .eq("status", "scheduled")
    .select("id, name, starts_at, coach_id")
    .maybeSingle();
  if (!claimed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select("first_name, last_name, timezone")
    .eq("id", user.id)
    .maybeSingle();
  const coachName =
    [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach";
  const dateStr = new Date(claimed.starts_at as string).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: (coach?.timezone as string | null) || "Europe/Paris",
  });

  const { data: seats } = await admin
    .from("bookings")
    .select("id, client_id, pack_credit_id, status")
    .eq("group_session_id", sessionId)
    .in("status", ["pending", "confirmed"]);

  let refunded = 0;
  let cancelled = 0;
  const errors: string[] = [];

  for (const b of seats ?? []) {
    try {
      // Place sur crédit de pack : le crédit revient au client (le coach
      // annule), le trigger SQL le restitue à l'annulation.
      const { data: done } = await admin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", b.id)
        .in("status", ["pending", "confirmed"])
        .select("id");
      if (!done?.length) continue;
      cancelled++;
      await detachMeetFromBooking(admin, b.id as string);

      const { data: payment } = await admin
        .from("payments")
        .select("id, amount_cents, currency, stripe_charge_id, stripe_payment_intent_id, escrow_status, refunded_cents")
        .eq("booking_id", b.id)
        .maybeSingle();

      let refundCents = 0;
      if (payment && payment.escrow_status === "authorized") {
        // Empreinte jamais débitée : on la libère.
        await admin
          .from("payments")
          .update({ escrow_status: "canceled", status: "canceled", resolved_at: new Date().toISOString() })
          .eq("id", payment.id)
          .eq("escrow_status", "authorized");
        if (payment.stripe_payment_intent_id) {
          try {
            await stripe.paymentIntents.cancel(
              payment.stripe_payment_intent_id as string,
              {},
              { idempotencyKey: `gcancel_auth_${payment.id}` }
            );
          } catch {
            /* déjà libérée */
          }
        }
      } else if (payment && payment.escrow_status === "held" && payment.stripe_charge_id) {
        const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
        refundCents = Math.max(0, (payment.amount_cents as number) - alreadyRefunded);
        if (refundCents > 0) {
          const { data: claimedPay } = await admin
            .from("payments")
            .update({
              escrow_status: "refunded",
              status: "refunded",
              refunded_cents: alreadyRefunded + refundCents,
              payout_cents: 0,
              commission_cents: 0,
              provider_fee_cents: 0,
              resolved_at: new Date().toISOString(),
            })
            .eq("id", payment.id)
            .eq("escrow_status", "held")
            .eq("refunded_cents", alreadyRefunded)
            .select("id");
          if (claimedPay?.length) {
            try {
              await stripe.refunds.create(
                { charge: payment.stripe_charge_id as string, amount: refundCents },
                { idempotencyKey: `gcancel_refund_${payment.id}` }
              );
              refunded += refundCents;
              try {
                const { data: noteId } = await admin.rpc("create_credit_note", {
                  p_payment: payment.id,
                  p_total_refunded_cents: alreadyRefunded + refundCents,
                  p_reason: "Cours collectif annulé par le coach",
                });
                await emailInvoice(admin, noteId as string | null);
              } catch {
                /* pièce comptable best-effort */
              }
            } catch (e) {
              // Remboursement raté : la ligne est rendue, retentable à la main.
              await admin
                .from("payments")
                .update({
                  escrow_status: "held",
                  status: "paid",
                  refunded_cents: alreadyRefunded,
                  resolved_at: null,
                })
                .eq("id", payment.id)
                .eq("escrow_status", "refunded");
              errors.push(`${payment.id}: ${e instanceof Error ? e.message : "refund_failed"}`);
              refundCents = 0;
            }
          }
        }
      }

      // Le participant est prévenu (best-effort).
      const { data: client } = await admin
        .from("clients")
        .select("email")
        .eq("id", b.client_id)
        .maybeSingle();
      if (client?.email) {
        const tpl =
          refundCents > 0
            ? refundClient({
                coachName,
                refundStr: (refundCents / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: ((payment?.currency as string) || "eur").toUpperCase(),
                }),
                reason: "cancellation",
              })
            : bookingCancelledClient({ coachName, dateStr, declined: false });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        await notifyClient(admin, {
          email: client.email,
          type: "cancelled",
          coachName,
          startsAt: claimed.starts_at as string,
          bookingId: b.id as string,
        });
      }
    } catch (e) {
      errors.push(`${b.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({ ok: true, cancelled, refunded_cents: refunded, errors });
}
