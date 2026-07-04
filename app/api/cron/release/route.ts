import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import { reviewRequestClient } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Job planifié (Vercel Cron) : libère les paiements sous séquestre arrivés à
// maturité (release_after dépassé) et non gelés → transfert de la part du
// coach vers son compte Connect. Toutes les transitions d'état sont
// CONDITIONNELLES (where escrow_status='held') : si une annulation, un litige
// ou un autre run traite la même ligne en même temps, un seul gagne.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const nowIso = new Date().toISOString();

  // Paiements mûrs, retenus, avec une charge à transférer. Les lignes sans
  // charge Stripe sont exclues (intraitables : elles ne doivent pas occuper
  // le lot).
  const { data: due } = await supabase
    .from("payments")
    .select(
      "id, coach_id, booking_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, refunded_cents, bookings(status)"
    )
    .eq("escrow_status", "held")
    .lte("release_after", nowIso)
    .not("stripe_charge_id", "is", null)
    .order("release_after", { ascending: true })
    .limit(100);

  let released = 0;
  let refunded = 0;
  const errors: string[] = [];

  for (const p of due ?? []) {
    try {
      const alreadyRefunded = (p.refunded_cents as number | null) ?? 0;
      const remaining = Math.max(0, p.amount_cents - alreadyRefunded);

      // Déjà tout remboursé (dashboard Stripe, incident…) : on clôt sans verser.
      if (remaining === 0) {
        await supabase
          .from("payments")
          .update({ escrow_status: "refunded", status: "refunded", resolved_at: nowIso })
          .eq("id", p.id)
          .eq("escrow_status", "held");
        continue;
      }

      // Séance jamais confirmée par le coach (mode approbation) et déjà
      // passée : remboursement intégral du restant au lieu de verser.
      const bookingRow = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
      if (bookingRow?.status === "pending" && p.booking_id) {
        // Le coach peut confirmer pendant ce run : transition conditionnelle.
        const { data: claimedBooking } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", p.booking_id)
          .eq("status", "pending")
          .select("id");
        if (!claimedBooking?.length) continue; // confirmée entre-temps

        const { data: claimedPay } = await supabase
          .from("payments")
          .update({
            escrow_status: "refunded",
            status: "refunded",
            refunded_cents: p.amount_cents,
            payout_cents: 0,
            resolved_at: nowIso,
          })
          .eq("id", p.id)
          .eq("escrow_status", "held")
          .select("id");
        if (!claimedPay?.length) continue;

        try {
          await stripe.refunds.create(
            { charge: p.stripe_charge_id as string, amount: remaining },
            { idempotencyKey: `release_refund_${p.id}` }
          );
        } catch (e) {
          // Remboursement raté : on rend la ligne au prochain run.
          await supabase
            .from("payments")
            .update({ escrow_status: "held", status: "paid", refunded_cents: alreadyRefunded, resolved_at: null })
            .eq("id", p.id);
          throw e;
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
        alreadyRefunded
      );

      // Réclame la ligne AVANT l'appel Stripe : un seul processus gagne.
      const { data: claimed } = await supabase
        .from("payments")
        .update({
          escrow_status: "released",
          commission_cents: breakdown.commissionCents,
          payout_cents: breakdown.payoutCents,
          released_at: nowIso,
        })
        .eq("id", p.id)
        .eq("escrow_status", "held")
        .select("id");
      if (!claimed?.length) continue;

      if (breakdown.payoutCents > 0) {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: breakdown.payoutCents,
              currency: p.currency || "eur",
              destination: coach.stripe_account_id,
              source_transaction: p.stripe_charge_id as string,
              transfer_group: `coach_${p.coach_id}`,
            },
            { idempotencyKey: `release_${p.id}` }
          );
          await supabase
            .from("payments")
            .update({ stripe_transfer_id: transfer.id })
            .eq("id", p.id);
        } catch (e) {
          // Transfert raté : on rend la ligne au prochain run.
          await supabase
            .from("payments")
            .update({ escrow_status: "held", released_at: null })
            .eq("id", p.id);
          throw e;
        }
      }

      if (p.booking_id) {
        await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("id", p.booking_id)
          .neq("status", "cancelled");

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
