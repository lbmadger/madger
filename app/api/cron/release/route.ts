import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computePayout } from "@/lib/stripe/escrow";
import { isPro } from "@/lib/subscription/plan";
import { sendEmail } from "@/lib/email/resend";
import {
  reviewRequestClient,
  bookingCancelledClient,
} from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";
import { detachMeetFromBooking } from "@/lib/google/calendar";

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

  // ── Empreintes bancaires périmées (modèle Airbnb) ──────────────────────────
  // Demande jamais traitée par le coach (séance passée), réservation annulée
  // sans nettoyage, ou autorisation en fin de vie (les banques les libèrent
  // vers 7 jours) : on annule proprement, RIEN n'a été prélevé au client.
  let expired = 0;
  const { data: auths } = await supabase
    .from("payments")
    .select(
      "id, coach_id, booking_id, stripe_payment_intent_id, created_at, bookings(status, starts_at)"
    )
    .eq("escrow_status", "authorized")
    .limit(100);
  for (const p of auths ?? []) {
    try {
      const br = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
      const startPassed = br?.starts_at
        ? new Date(br.starts_at as string).getTime() < Date.now()
        : false;
      const tooOld = p.created_at
        ? Date.now() - new Date(p.created_at as string).getTime() >
          6 * 86400000
        : false;
      const bookingGone = !br || br.status === "cancelled";
      if (!(startPassed || tooOld || bookingGone)) continue;

      const { data: claimed } = await supabase
        .from("payments")
        .update({
          escrow_status: "canceled",
          status: "canceled",
          resolved_at: nowIso,
        })
        .eq("id", p.id)
        .eq("escrow_status", "authorized")
        .select("id");
      if (!claimed?.length) continue;

      try {
        if (p.stripe_payment_intent_id) {
          await stripe.paymentIntents.cancel(
            p.stripe_payment_intent_id as string,
            {},
            { idempotencyKey: `cancelauth_${p.id}` }
          );
        }
      } catch {
        /* déjà annulée / expirée côté Stripe */
      }
      await supabase.from("pack_credits").delete().eq("payment_id", p.id);

      if (p.booking_id && br?.status === "pending") {
        await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", p.booking_id)
          .eq("status", "pending");
        // Prévient le client (best-effort) : rien n'a été débité.
        try {
          const { data: bk } = await supabase
            .from("bookings")
            .select("starts_at, clients(email), coaches(first_name, last_name)")
            .eq("id", p.booking_id)
            .maybeSingle();
          const cl = Array.isArray(bk?.clients) ? bk?.clients[0] : bk?.clients;
          const co = Array.isArray(bk?.coaches) ? bk?.coaches[0] : bk?.coaches;
          if (cl?.email) {
            const tpl = bookingCancelledClient({
              coachName:
                [co?.first_name, co?.last_name].filter(Boolean).join(" ") ||
                "Le coach",
              dateStr: new Date(bk?.starts_at as string).toLocaleString(
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
              declined: true,
            });
            await sendEmail({ to: cl.email, subject: tpl.subject, html: tpl.html });
          }
        } catch {
          /* best-effort */
        }
      }
      expired++;
    } catch {
      /* ligne suivante */
    }
  }

  // Paiements mûrs, retenus, avec une charge à transférer, traités PAR LOTS
  // jusqu'à épuisement (ou fin du budget temps) : le volume quotidien passe
  // entièrement, quel que soit le nombre de coachs. Les lignes en échec sont
  // écartées du run courant (retentées au prochain).
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  let released = 0;
  let refunded = 0;
  const errors: string[] = [];
  const skipIds = new Set<string>();

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: due } = await supabase
      .from("payments")
      .select(
        "id, coach_id, booking_id, amount_cents, currency, stripe_charge_id, stripe_fee_cents, refunded_cents, bookings(status)"
      )
      .eq("escrow_status", "held")
      .lte("release_after", nowIso)
      .not("stripe_charge_id", "is", null)
      .order("release_after", { ascending: true })
      .limit(50);
    const batch = (due ?? []).filter((p) => !skipIds.has(p.id as string));
    if (batch.length === 0) break;

    // Comptes Stripe et plans des coachs du lot, en une seule requête.
    const coachIds = Array.from(new Set(batch.map((p) => p.coach_id as string)));
    const { data: coachRows } = await supabase
      .from("coaches")
      .select("id, stripe_account_id, pro_until")
      .in("id", coachIds);
    const coachById = new Map(
      (coachRows ?? []).map((c) => [c.id as string, c])
    );

  for (const p of batch) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
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
        if (!claimedBooking?.length) {
          // Confirmée entre-temps : on écarte du run courant.
          skipIds.add(p.id as string);
          continue;
        }
        await detachMeetFromBooking(supabase, p.booking_id as string);

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

      const coach = coachById.get(p.coach_id as string);
      if (!coach?.stripe_account_id) {
        // Compte Connect absent : intraitable ce run, on écarte.
        skipIds.add(p.id as string);
        continue;
      }

      const breakdown = computePayout(
        p.amount_cents,
        p.stripe_fee_cents ?? 0,
        isPro(coach.pro_until as string | null),
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
      skipIds.add(p.id as string);
      errors.push(`${p.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  }

  return NextResponse.json({ released, refunded, expired, errors });
}
