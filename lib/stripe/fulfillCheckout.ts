import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import {
  bookingConfirmationClient,
  bookingNotificationCoach,
  requestReceivedClient,
  newRequestCoach,
} from "@/lib/email/templates";
import { googleCalendarUrl } from "@/lib/calendar/links";
import { attachMeetToBooking } from "@/lib/google/calendar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Délai après la fin de la séance avant libération automatique des fonds au
// coach (si aucun problème n'est signalé par le client).
const RELEASE_DELAY_MS = 24 * 60 * 60 * 1000;

export type FulfillResult = {
  slug: string;
  bookingId: string;
  // Créneau pris entre-temps par quelqu'un d'autre : client remboursé à 100 %.
  conflict: boolean;
};

// Enregistre un paiement Stripe Checkout (séquestre) : client, séance,
// paiement RETENU, crédits de pack, emails. Appelé par le webhook
// checkout.session.completed ET par la redirection de retour : idempotent
// (index unique sur stripe_payment_intent_id), le premier arrivé gagne.
export async function fulfillCheckoutSession(
  sessionId: string
): Promise<FulfillResult> {
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result: FulfillResult = { slug: "", bookingId: "", conflict: false };
  if (!stripe || !serviceKey || !sessionId) return result;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge.balance_transaction"],
  });
  const m = session.metadata ?? {};
  result.slug = m.coach_slug || "";
  if (!m.coach_id) return result;

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const pi =
    session.payment_intent && typeof session.payment_intent !== "string"
      ? (session.payment_intent as Stripe.PaymentIntent)
      : null;
  const charge =
    pi && typeof pi.latest_charge !== "string"
      ? (pi.latest_charge as Stripe.Charge | null)
      : null;
  const bt =
    charge && typeof charge.balance_transaction !== "string"
      ? (charge.balance_transaction as Stripe.BalanceTransaction | null)
      : null;
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : pi?.id ?? sessionId;
  const chargeId = charge?.id ?? null;
  const feeCents = bt?.fee ?? 0;

  // Modèle Airbnb : en mode approbation la carte est AUTORISÉE (empreinte),
  // pas débitée. Le débit (capture) part quand le coach accepte.
  const authorized = pi?.status === "requires_capture";
  if (session.payment_status !== "paid" && !authorized) return result;

  // Anti-doublon : paiement déjà enregistré (webhook ou retour navigateur) ?
  const { data: existing } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  if (existing) {
    result.bookingId = (existing.booking_id as string | null) ?? "";
    return result;
  }

  const durationMin = Number(m.duration_min) || 60;
  const starts = new Date(m.starts_at);
  const ends = new Date(starts.getTime() + durationMin * 60 * 1000);
  const releaseAfter = new Date(ends.getTime() + RELEASE_DELAY_MS);

  // Créneau pris entre-temps (autre client payé/en attente qui chevauche) →
  // remboursement intégral immédiat, aucune séance créée.
  const { data: overlapping } = await supabase
    .from("bookings")
    .select("id")
    .eq("coach_id", m.coach_id)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", ends.toISOString())
    .gt("ends_at", starts.toISOString())
    .limit(1);
  if ((overlapping ?? []).length > 0) {
    // Le conflit est acté AVANT l'appel Stripe : même si l'annulation/le
    // remboursement échoue ponctuellement, le client ne voit jamais un faux
    // « payé » (et Stripe libère une empreinte expirée tout seul).
    result.conflict = true;
    // Empreinte non capturée : on ANNULE la PaymentIntent (refund impossible
    // sur une charge non capturée). Paiement débité : remboursement intégral.
    if (authorized) {
      await stripe.paymentIntents.cancel(
        piId,
        {},
        { idempotencyKey: `conflict_cancel_${piId}` }
      );
    } else if (chargeId) {
      await stripe.refunds.create(
        { charge: chargeId },
        { idempotencyKey: `conflict_refund_${piId}` }
      );
    }
    return result;
  }

  // Client (réutilise l'existant par email chez ce coach).
  let clientId: string | null = null;
  if (m.email) {
    const { data: c } = await supabase
      .from("clients")
      .select("id")
      .eq("coach_id", m.coach_id)
      .ilike("email", m.email)
      .maybeSingle();
    clientId = c?.id ?? null;
  }
  if (!clientId) {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        coach_id: m.coach_id,
        first_name: m.first_name || "Client",
        last_name: m.last_name || null,
        email: m.email || null,
        phone: m.phone || null,
      })
      .select("id")
      .single();
    clientId = created?.id ?? null;
  }

  // Mode de réservation du coach : instant → confirmée d'office,
  // approbation → à valider (refus = remboursement intégral).
  const { data: coachMode } = await supabase
    .from("coaches")
    .select("booking_mode")
    .eq("id", m.coach_id)
    .maybeSingle();
  const bookingStatus =
    coachMode?.booking_mode === "approval" ? "pending" : "confirmed";

  // Ordre volontaire : séance en 'pending' D'ABORD, puis le paiement, puis la
  // confirmation. Ainsi le trigger des packs voit le paiement attaché et ne
  // consomme jamais de crédit sur une séance déjà payée à part.
  const { data: booking } = await supabase
    .from("bookings")
    .insert({
      coach_id: m.coach_id,
      client_id: clientId,
      service_id: m.service_id || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "pending",
      location: m.online === "1" ? "online" : "in_person",
      notes: m.message || null,
    })
    .select("id")
    .single();
  result.bookingId = booking?.id ?? "";

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert({
      coach_id: m.coach_id,
      client_id: clientId,
      booking_id: booking?.id ?? null,
      service_id: m.service_id || null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
      // Autorisé (empreinte) : débité seulement à l'acceptation du coach.
      status: authorized ? "pending" : "paid",
      stripe_payment_intent_id: piId,
      stripe_charge_id: chargeId,
      stripe_fee_cents: feeCents,
      escrow_status: authorized ? "authorized" : "held",
      release_after: releaseAfter.toISOString(),
      paid_at: authorized ? null : new Date().toISOString(),
    })
    .select("id")
    .single();

  // Course perdue (l'autre appel a inséré en premier via l'index unique) :
  // on retire la séance en double et on renvoie celle déjà créée.
  if (payError) {
    if (booking) {
      await supabase.from("bookings").delete().eq("id", booking.id);
    }
    const { data: winner } = await supabase
      .from("payments")
      .select("booking_id")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    result.bookingId = (winner?.booking_id as string | null) ?? "";
    return result;
  }

  // Achat d'un PACK : crée le solde de crédits (la séance réservée à l'achat
  // compte pour 1) et rattache la séance au pack.
  if (m.service_id && clientId) {
    const { data: svc } = await supabase
      .from("services")
      .select("type, pack_size")
      .eq("id", m.service_id)
      .maybeSingle();
    if (svc?.type === "pack" && (svc.pack_size ?? 0) > 1) {
      const { data: credit } = await supabase
        .from("pack_credits")
        .insert({
          coach_id: m.coach_id,
          client_id: clientId,
          service_id: m.service_id,
          payment_id: payment?.id ?? null,
          total: svc.pack_size,
          used: 1,
        })
        .select("id")
        .single();
      if (credit && booking) {
        await supabase
          .from("bookings")
          .update({ pack_credit_id: credit.id })
          .eq("id", booking.id);
      }
    }
  }

  // Confirmation (mode instantané) : après le paiement, pour que le trigger
  // pack ignore cette séance déjà payée.
  if (bookingStatus === "confirmed" && booking) {
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);
  }

  // Séance confirmée : événement dans l'agenda Google du coach (si son
  // compte est connecté) ; en visio, un lien Meet est intégré. En mode
  // approbation, l'événement est créé à la confirmation par le coach.
  let meetUrl: string | undefined;
  if (booking && bookingStatus === "confirmed") {
    meetUrl =
      (await attachMeetToBooking(supabase, {
        bookingId: booking.id,
        coachId: m.coach_id,
        starts,
        ends,
        clientName:
          [m.first_name, m.last_name].filter(Boolean).join(" ") || undefined,
        clientEmail: m.email || null,
      })) ?? undefined;
  }

  // Emails de confirmation (client + notification coach). Best-effort : un
  // échec d'email ne doit pas casser le paiement déjà encaissé.
  try {
    const [{ data: coachRow }, { data: coachAuth }] = await Promise.all([
      supabase
        .from("coaches")
        .select("first_name, last_name, timezone, locale")
        .eq("id", m.coach_id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(m.coach_id),
    ]);
    const coachName =
      [coachRow?.first_name, coachRow?.last_name].filter(Boolean).join(" ") ||
      "Ton coach";
    const coachLocale = coachRow?.locale === "en" ? ("en" as const) : ("fr" as const);
    const dateStr = starts.toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: coachRow?.timezone || "Europe/Paris",
    });
    const priceStr = ((session.amount_total ?? 0) / 100).toLocaleString(
      "fr-FR",
      {
        style: "currency",
        currency: (session.currency ?? "eur").toUpperCase(),
      }
    );
    const online = m.online === "1";
    const reservationUrl = `${APP_URL}/reservation/${result.bookingId}`;
    const calendarUrl = googleCalendarUrl({
      title: `Séance avec ${coachName}`,
      start: starts,
      end: ends,
      details: [
        meetUrl ? `Visio : ${meetUrl}` : null,
        `Ma réservation : ${reservationUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      location: meetUrl,
    });

    const clientName =
      [m.first_name, m.last_name].filter(Boolean).join(" ") || "Client";
    const coachEmail = coachAuth?.user?.email;

    if (authorized) {
      // Demande en attente d'acceptation : empreinte bancaire, pas de débit.
      if (m.email) {
        const t = requestReceivedClient({
          coachName,
          dateStr,
          instant: false,
          reservationUrl,
          authorizedPriceStr: priceStr,
        });
        await sendEmail({ to: m.email, subject: t.subject, html: t.html });
      }
      if (coachEmail) {
        const t = newRequestCoach({
          locale: coachLocale,
          clientName,
          dateStr,
          online,
          instant: false,
          dashboardUrl: `${APP_URL}/dashboard/agenda`,
        });
        await sendEmail({ to: coachEmail, subject: t.subject, html: t.html });
      }
    } else {
      if (m.email) {
        const t = bookingConfirmationClient({
          coachName,
          dateStr,
          priceStr,
          online,
          reservationUrl,
          meetUrl,
          calendarUrl,
        });
        await sendEmail({ to: m.email, subject: t.subject, html: t.html });
      }
      if (coachEmail) {
        const t = bookingNotificationCoach({
          locale: coachLocale,
          clientName,
          dateStr,
          serviceName: "Séance",
          priceStr,
          online,
          dashboardUrl: `${APP_URL}/dashboard/agenda`,
        });
        await sendEmail({ to: coachEmail, subject: t.subject, html: t.html });
      }
    }
  } catch {
    /* emails best-effort */
  }

  return result;
}
