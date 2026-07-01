import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Retour après paiement Stripe. On vérifie que la session est payée, puis on
// enregistre (service role) : le client, la séance (confirmée) et le paiement.
// Idempotent : si le paiement est déjà enregistré, on ne recrée rien.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const acct = searchParams.get("acct");
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripe || !serviceKey || !sessionId || !acct) {
    return NextResponse.redirect(`${origin}/coachs`);
  }

  let slug = "";
  try {
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      undefined,
      { stripeAccount: acct }
    );
    const m = session.metadata ?? {};
    slug = m.coach_slug || "";

    if (session.payment_status === "paid" && m.coach_id) {
      const supabase = createClient(SUPABASE_URL, serviceKey);
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? sessionId;

      // Anti-doublon : paiement déjà enregistré ?
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", pi)
        .maybeSingle();

      if (!existing) {
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

        await supabase.from("payments").insert({
          coach_id: m.coach_id,
          client_id: clientId,
          booking_id: booking?.id ?? null,
          service_id: m.service_id || null,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: "paid",
          stripe_payment_intent_id: pi,
          paid_at: new Date().toISOString(),
        });
      }
    }
  } catch {
    /* ignore, on redirige quand même */
  }

  return NextResponse.redirect(`${origin}/${slug || "coachs"}?paid=1`);
}
