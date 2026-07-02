import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import { reviewRequestClient } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Job planifié (Vercel Cron) : libère les paiements sous séquestre arrivés à
// maturité (release_after dépassé) et non gelés → transfert de la part du coach
// vers son compte Connect. Sécurisé par CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const nowIso = new Date().toISOString();

  // Paiements mûrs, retenus, avec une charge à transférer.
  const { data: due } = await supabase
    .from("payments")
    .select(
      "id, coach_id, booking_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, bookings(status)"
    )
    .eq("escrow_status", "held")
    .lte("release_after", nowIso)
    .limit(100);

  let released = 0;
  let refunded = 0;
  const errors: string[] = [];

  for (const p of due ?? []) {
    try {
      if (!p.stripe_charge_id) continue;

      // Séance jamais confirmée par le coach (mode approbation) et déjà
      // passée : on rembourse intégralement le client au lieu de verser.
      const bookingRow = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
      if (bookingRow?.status === "pending") {
        await stripe.refunds.create(
          { charge: p.stripe_charge_id, amount: p.amount_cents },
          { idempotencyKey: `release_refund_${p.id}` }
        );
        await supabase
          .from("payments")
          .update({
            escrow_status: "refunded",
            status: "refunded",
            refunded_cents: p.amount_cents,
            payout_cents: 0,
            resolved_at: nowIso,
          })
          .eq("id", p.id);
        if (p.booking_id) {
          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", p.booking_id);
        }
        refunded++;
        continue;
      }

      const { data: coach } = await supabase
        .from("coaches")
        .select("stripe_account_id, pro_until")
        .eq("id", p.coach_id)
        .maybeSingle();
      if (!coach?.stripe_account_id) continue;

      const breakdown = computePayout(
        p.amount_cents,
        p.stripe_fee_cents ?? 0,
        isPro(coach.pro_until),
        0
      );

      if (breakdown.payoutCents > 0) {
        const transfer = await stripe.transfers.create(
          {
            amount: breakdown.payoutCents,
            currency: p.currency || "eur",
            destination: coach.stripe_account_id,
            source_transaction: p.stripe_charge_id,
            transfer_group: `coach_${p.coach_id}`,
          },
          { idempotencyKey: `release_${p.id}` }
        );
        await supabase
          .from("payments")
          .update({
            escrow_status: "released",
            stripe_transfer_id: transfer.id,
            commission_cents: breakdown.commissionCents,
            payout_cents: breakdown.payoutCents,
            released_at: nowIso,
          })
          .eq("id", p.id);
      } else {
        // Rien à transférer (montant absorbé par frais/commission) : on clôt.
        await supabase
          .from("payments")
          .update({
            escrow_status: "released",
            commission_cents: breakdown.commissionCents,
            payout_cents: 0,
            released_at: nowIso,
          })
          .eq("id", p.id);
      }

      if (p.booking_id) {
        await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("id", p.booking_id);

        // Invite le client à noter sa séance (1 client = 1 avis). Best-effort.
        try {
          const { data: bk } = await supabase
            .from("bookings")
            .select("client_id, clients(email), coaches(first_name, last_name)")
            .eq("id", p.booking_id)
            .maybeSingle();
          const cl = Array.isArray(bk?.clients) ? bk?.clients[0] : bk?.clients;
          const co = Array.isArray(bk?.coaches) ? bk?.coaches[0] : bk?.coaches;
          if (cl?.email) {
            const tpl = reviewRequestClient({
              coachName:
                [co?.first_name, co?.last_name].filter(Boolean).join(" ") ||
                "ton coach",
              reservationUrl: `${APP_URL}/reservation/${p.booking_id}`,
            });
            await sendEmail({ to: cl.email, subject: tpl.subject, html: tpl.html });
          }
        } catch {
          /* best-effort */
        }
      }
      released++;
    } catch (e) {
      errors.push(`${p.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({ released, refunded, errors });
}
