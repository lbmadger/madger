import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { requestReceivedClient } from "@/lib/email/templates";
import { googleCalendarUrl } from "@/lib/calendar/links";
import { attachMeetToBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
// Stripe + agenda Google + emails en série : marge au-delà des 10 s par défaut.
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le coach confirme une demande en attente (modèle Airbnb) :
//  1. la confirmation doit arriver AVANT la limite choisie par le coach
//     (min_notice_hours avant la séance), sinon 409 too_late ;
//  2. si la demande était payée, la carte du client (autorisée à la
//     réservation) est DÉBITÉE maintenant (capture) ; échec → la demande
//     reste en attente et le coach est invité à la décliner ;
//  3. la séance passe en confirmée + événement agenda/Meet + email client.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Demande en attente du coach connecté (RLS).
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, client_id, location, meeting_url, google_event_id, status"
    )
    .eq("id", bookingId)
    .eq("status", "pending")
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Limite d'acceptation : min_notice_hours avant le début de la séance.
  const { data: me } = await supabase
    .from("coaches")
    .select("first_name, last_name, min_notice_hours")
    .eq("id", user.id)
    .maybeSingle();
  const noticeMs = ((me?.min_notice_hours as number) || 2) * 3600000;
  if (Date.now() > new Date(booking.starts_at as string).getTime() - noticeMs) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = serviceKey ? createAdmin(SUPABASE_URL, serviceKey) : null;

  // Paiement autorisé (empreinte) rattaché ? → débit à l'acceptation.
  if (admin) {
    const { data: payment } = await admin
      .from("payments")
      .select("id, stripe_payment_intent_id, escrow_status")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (payment?.escrow_status === "authorized") {
      const stripe = getStripe();
      if (!stripe || !payment.stripe_payment_intent_id) {
        return NextResponse.json({ error: "not_configured" }, { status: 500 });
      }
      // Réclame la ligne avant l'appel Stripe (anti double confirmation).
      const { data: claimed } = await admin
        .from("payments")
        .update({ escrow_status: "held" })
        .eq("id", payment.id)
        .eq("escrow_status", "authorized")
        .select("id");
      if (!claimed?.length) {
        return NextResponse.json(
          { error: "already_processed" },
          { status: 409 }
        );
      }
      try {
        await stripe.paymentIntents.capture(
          payment.stripe_payment_intent_id as string,
          {},
          { idempotencyKey: `capture_${payment.id}` }
        );
      } catch (e) {
        // Capture impossible (carte expirée, autorisation périmée…) : on
        // rend la ligne, la demande reste en attente, le coach décline.
        await admin
          .from("payments")
          .update({ escrow_status: "authorized" })
          .eq("id", payment.id);
        console.error("[confirm] capture failed", e);
        return NextResponse.json({ error: "capture_failed" }, { status: 402 });
      }
      // Frais Stripe réels après capture : best-effort SÉPARÉ de la capture.
      // Si ce retrieve échouait dans le même try, le revert remettrait la
      // ligne en "authorized" alors que le client est réellement débité, et
      // un decline ultérieur croirait annuler une simple empreinte.
      try {
        const pi = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id as string,
          { expand: ["latest_charge.balance_transaction"] }
        );
        const charge =
          pi.latest_charge && typeof pi.latest_charge !== "string"
            ? pi.latest_charge
            : null;
        const bt =
          charge && typeof charge.balance_transaction !== "string"
            ? charge.balance_transaction
            : null;
        await admin
          .from("payments")
          .update({
            status: "paid",
            stripe_charge_id: charge?.id ?? null,
            stripe_fee_cents: bt?.fee ?? 0,
            paid_at: new Date().toISOString(),
          })
          .eq("id", payment.id);
      } catch (e) {
        // Capture réussie mais détail des frais indisponible : la ligne est
        // au moins marquée payée (frais 0, rattrapables), jamais rendue.
        console.error("[confirm] post-capture retrieve failed", e);
        await admin
          .from("payments")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", payment.id);
      }
    }
  }

  // Confirme la séance (conditionnel : toujours pending).
  const { data: confirmedRow, error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error || !confirmedRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Email au client + événement agenda/Meet (best-effort).
  try {
    if (admin && booking.client_id) {
      const { data: client } = await admin
        .from("clients")
        .select("email")
        .eq("id", booking.client_id)
        .maybeSingle();

      let meetUrl = (booking.meeting_url as string | null) ?? undefined;
      if (!booking.google_event_id) {
        meetUrl =
          (await attachMeetToBooking(admin, {
            bookingId: booking.id as string,
            coachId: user.id,
            starts: new Date(booking.starts_at as string),
            ends: new Date(
              (booking.ends_at as string) ?? (booking.starts_at as string)
            ),
            clientEmail: client?.email ?? null,
          })) ?? undefined;
      }

      if (client?.email) {
        const coachName =
          [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
          "Ton coach";
        const tpl = requestReceivedClient({
          coachName,
          dateStr: new Date(booking.starts_at as string).toLocaleString(
            "fr-FR",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            }
          ),
          instant: true, // variante « confirmée »
          reservationUrl: `${APP_URL}/reservation/${booking.id}`,
          meetUrl,
          calendarUrl: googleCalendarUrl({
            title: `Séance avec ${coachName}`,
            start: new Date(booking.starts_at as string),
            end: new Date(
              (booking.ends_at as string) ?? (booking.starts_at as string)
            ),
            details: [
              meetUrl ? `Visio : ${meetUrl}` : null,
              `Ma réservation : ${APP_URL}/reservation/${booking.id}`,
            ]
              .filter(Boolean)
              .join("\n"),
            location: meetUrl,
          }),
        });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
      }
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
