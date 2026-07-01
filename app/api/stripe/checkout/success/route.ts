import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Délai après la fin de la séance avant libération automatique des fonds au
// coach (si aucun problème n'est signalé par le client).
const RELEASE_DELAY_MS = 24 * 60 * 60 * 1000;

// Retour après paiement Stripe (charge plateforme = séquestre). On vérifie que
// la session est payée, on lit les frais Stripe réels, puis on enregistre
// (service role) : le client, la séance (confirmée) et le paiement RETENU.
// Idempotent : si le paiement est déjà enregistré, on ne recrée rien.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripe || !serviceKey || !sessionId) {
    return NextResponse.redirect(`${origin}/coachs`);
  }

  let slug = "";
  let bookingId = "";
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge.balance_transaction"],
    });
    const m = session.metadata ?? {};
    slug = m.coach_slug || "";

    if (session.payment_status === "paid" && m.coach_id) {
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

      // Anti-doublon : paiement déjà enregistré ?
      const { data: existing } = await supabase
        .from("payments")
        .select("id, booking_id")
        .eq("stripe_payment_intent_id", piId)
        .maybeSingle();

      if (existing) {
        bookingId = (existing.booking_id as string | null) ?? "";
      } else {
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

        const durationMin = Number(m.duration_min) || 60;
        const starts = new Date(m.starts_at);
        const ends = new Date(starts.getTime() + durationMin * 60 * 1000);
        const releaseAfter = new Date(ends.getTime() + RELEASE_DELAY_MS);

        const { data: booking } = await supabase
          .from("bookings")
          .insert({
            coach_id: m.coach_id,
            client_id: clientId,
            service_id: m.service_id || null,
            starts_at: starts.toISOString(),
            ends_at: ends.toISOString(),
            status: "confirmed",
            location: m.online === "1" ? "online" : "in_person",
            notes: m.message || null,
          })
          .select("id")
          .single();
        bookingId = booking?.id ?? "";

        await supabase.from("payments").insert({
          coach_id: m.coach_id,
          client_id: clientId,
          booking_id: booking?.id ?? null,
          service_id: m.service_id || null,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: "paid",
          stripe_payment_intent_id: piId,
          stripe_charge_id: chargeId,
          stripe_fee_cents: feeCents,
          escrow_status: "held",
          release_after: releaseAfter.toISOString(),
          paid_at: new Date().toISOString(),
        });
      }
    }
  } catch {
    /* ignore, on redirige quand même */
  }

  if (bookingId) {
    return NextResponse.redirect(`${origin}/reservation/${bookingId}?paid=1`);
  }
  return NextResponse.redirect(`${origin}/${slug || "coachs"}?paid=1`);
}
