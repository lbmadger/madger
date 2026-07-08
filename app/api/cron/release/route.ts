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
  payoutReleasedCoach,
  refundClient,
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
    // Les lignes écartées sont exclues CÔTÉ SERVEUR : filtrer après coup ne
    // suffit pas, 50 lignes en échec en tête de file (order + limit 50)
    // rempliraient chaque lot et bloqueraient tous les versements suivants.
    const dueQuery = supabase
      .from("payments")
      .select(
        "id, coach_id, booking_id, amount_cents, currency, paid_at, stripe_charge_id, stripe_fee_cents, refunded_cents, released_cents, commission_cents, bookings(status, clients(first_name, last_name, email), coaches(first_name, last_name))"
      )
      .eq("escrow_status", "held")
      .lte("release_after", nowIso)
      .not("stripe_charge_id", "is", null);
    if (skipIds.size > 0) {
      // Format PostgREST pour une liste d'uuid : ("id1","id2").
      dueQuery.not(
        "id",
        "in",
        `(${Array.from(skipIds)
          .map((id) => `"${id}"`)
          .join(",")})`
      );
    }
    const { data: due } = await dueQuery
      .order("release_after", { ascending: true })
      .limit(50);
    const batch = (due ?? []).filter((p) => !skipIds.has(p.id as string));
    if (batch.length === 0) break;

    // Comptes Stripe et plans des coachs du lot, en une seule requête.
    const coachIds = Array.from(new Set(batch.map((p) => p.coach_id as string)));
    const { data: coachRows } = await supabase
      .from("coaches")
      .select("id, stripe_account_id, pro_until, locale")
      .in("id", coachIds);
    const coachById = new Map(
      (coachRows ?? []).map((c) => [c.id as string, c])
    );
    // Email de chaque coach du lot (1 appel Auth par coach, pas par paiement).
    const coachEmailById = new Map<string, string>();
    for (const cid of coachIds) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      try {
        const { data: u } = await supabase.auth.admin.getUserById(cid);
        if (u?.user?.email) coachEmailById.set(cid, u.user.email);
      } catch {
        /* best-effort */
      }
    }
    // Packs du lot : un paiement de pack se libère séance par séance.
    const { data: packRows } = await supabase
      .from("pack_credits")
      .select("id, payment_id, total, used")
      .in(
        "payment_id",
        batch.map((p) => p.id as string)
      );
    const packByPayment = new Map(
      (packRows ?? [])
        .filter((pk) => pk.payment_id)
        .map((pk) => [pk.payment_id as string, pk])
    );

    // Emails du lot envoyés APRÈS les débits : le budget temps sert d'abord
    // à verser, jamais à attendre Resend.
    const emailJobs: Array<() => Promise<unknown>> = [];

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
          // La réservation aussi doit retrouver son statut pending : laissée
          // cancelled, le run suivant ne repasserait plus par cette branche
          // et VERSERAIT la ligne au coach au lieu de retenter le refund.
          await supabase
            .from("bookings")
            .update({ status: "pending" })
            .eq("id", p.booking_id as string)
            .eq("status", "cancelled");
          throw e;
        }
        // Remboursement parti : le client est prévenu (best-effort, différé
        // après le lot comme les autres emails).
        {
          const cl = Array.isArray(bookingRow?.clients)
            ? bookingRow?.clients[0]
            : bookingRow?.clients;
          const co = Array.isArray(bookingRow?.coaches)
            ? bookingRow?.coaches[0]
            : bookingRow?.coaches;
          if (cl?.email) {
            const clEmail = cl.email as string;
            const tpl = refundClient({
              coachName:
                [co?.first_name, co?.last_name].filter(Boolean).join(" ") ||
                "Ton coach",
              refundStr: (remaining / 100).toLocaleString("fr-FR", {
                style: "currency",
                currency: (p.currency || "eur").toUpperCase(),
              }),
              reason: "cancellation",
            });
            emailJobs.push(() =>
              sendEmail({ to: clEmail, subject: tpl.subject, html: tpl.html })
            );
          }
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

      const alreadyReleased = (p.released_cents as number | null) ?? 0;

      // ── Pack en cours de consommation : libération séance par séance ──────
      // La part des séances consommées (passées depuis 24 h) part au coach,
      // le reste demeure sous séquestre (remboursable au prorata si le client
      // annule). Sécurité : libération totale 180 jours après l'achat.
      const pack = packByPayment.get(p.id as string);
      const packExpired =
        pack &&
        p.paid_at &&
        Date.now() - new Date(p.paid_at as string).getTime() >
          180 * 86400000;
      // Un pack reste en mode progressif tant que toutes ses séances ne sont
      // pas MÛRES : `used` compte les séances RÉSERVÉES (le trigger incrémente
      // à la confirmation), pas effectuées. Un pack entièrement planifié
      // d'avance basculerait sinon en libération totale dès la 1re séance.
      if (pack && pack.total > 1 && !packExpired) {
        // Séances liées au pack, non annulées, terminées depuis 24 h. La
        // séance de l'achat (p.booking_id, rattachée au pack par
        // fulfillCheckout) est exclue : elle est déjà comptée via selfUnit.
        let maturedQuery = supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("pack_credit_id", pack.id)
          .neq("status", "cancelled")
          .lte(
            "ends_at",
            new Date(Date.now() - 24 * 3600 * 1000).toISOString()
          );
        if (p.booking_id) {
          maturedQuery = maturedQuery.neq("id", p.booking_id as string);
        }
        const { count: matured } = await maturedQuery;
        // La 1re séance (celle de l'achat) est portée par p.booking_id : son
        // release_after est dépassé puisque la ligne est dans le lot.
        const selfUnit =
          p.booking_id && bookingRow && bookingRow.status !== "cancelled"
            ? 1
            : 0;
        const units = Math.min(pack.total, (matured ?? 0) + selfUnit);

        // Tant qu'il reste des séances non mûres, on verse au prorata et on
        // garde le reste sous séquestre. La libération finale (ci-dessous)
        // n'arrive que pack entièrement mûr ou expiré (cap 180 jours).
        if (units < pack.total) {
          const targetReleased = Math.floor(
            (breakdown.payoutCents * units) / pack.total
          );
          const targetCommission = Math.floor(
            (breakdown.commissionCents * units) / pack.total
          );
          const deltaPayout = targetReleased - alreadyReleased;
          const nextCheck = new Date(Date.now() + 7 * 86400000).toISOString();

          if (deltaPayout <= 0) {
            // Rien de mûr : on repasse dans une semaine.
            await supabase
              .from("payments")
              .update({ release_after: nextCheck })
              .eq("id", p.id)
              .eq("escrow_status", "held");
            continue;
          }

          const prevCommission = (p.commission_cents as number | null) ?? 0;
          const { data: claimedPack } = await supabase
            .from("payments")
            .update({
              released_cents: targetReleased,
              payout_cents: targetReleased,
              commission_cents: targetCommission,
              released_at: nowIso,
              release_after: nextCheck,
            })
            .eq("id", p.id)
            .eq("escrow_status", "held")
            .eq("released_cents", alreadyReleased)
            .select("id");
          if (!claimedPack?.length) continue;

          try {
            const transfer = await stripe.transfers.create(
              {
                amount: deltaPayout,
                currency: p.currency || "eur",
                destination: coach.stripe_account_id,
                source_transaction: p.stripe_charge_id as string,
                transfer_group: `coach_${p.coach_id}`,
              },
              { idempotencyKey: `release_${p.id}_u${units}` }
            );
            await supabase
              .from("payments")
              .update({ stripe_transfer_id: transfer.id })
              .eq("id", p.id);
          } catch (e) {
            await supabase
              .from("payments")
              .update({
                released_cents: alreadyReleased,
                payout_cents: alreadyReleased,
                commission_cents: prevCommission,
                released_at: null,
              })
              .eq("id", p.id)
              .eq("released_cents", targetReleased);
            throw e;
          }
          released++;

          const coachEmailPack = coachEmailById.get(p.coach_id as string);
          if (coachEmailPack) {
            // Montants et repli dans la langue du coach.
            const coachLocale = coach.locale === "en" ? ("en" as const) : ("fr" as const);
            const eurosStr = (cents: number) =>
              (cents / 100).toLocaleString(
                coachLocale === "en" ? "en-GB" : "fr-FR",
                {
                  style: "currency",
                  currency: "EUR",
                }
              );
            const cl0 = Array.isArray(bookingRow?.clients)
              ? bookingRow?.clients[0]
              : bookingRow?.clients;
            const tpl = payoutReleasedCoach({
              locale: coachLocale,
              clientName:
                [cl0?.first_name, cl0?.last_name].filter(Boolean).join(" ") ||
                (coachLocale === "en" ? "your client" : "ton client"),
              payoutStr: eurosStr(deltaPayout),
              dashboardUrl: `${APP_URL}/dashboard/paiements`,
              commissionStr:
                targetCommission - prevCommission > 0
                  ? eurosStr(targetCommission - prevCommission)
                  : undefined,
            });
            emailJobs.push(() =>
              sendEmail({
                to: coachEmailPack,
                subject: tpl.subject,
                html: tpl.html,
              })
            );
          }
          continue;
        }
        // Toutes les séances du pack sont mûres : libération finale.
      }

      // ── Libération finale (séance simple, ou pack consommé/expiré) ────────
      // Réclame la ligne AVANT l'appel Stripe : un seul processus gagne.
      const finalTransfer = Math.max(
        0,
        breakdown.payoutCents - alreadyReleased
      );
      const { data: claimed } = await supabase
        .from("payments")
        .update({
          escrow_status: "released",
          commission_cents: breakdown.commissionCents,
          payout_cents: breakdown.payoutCents,
          released_cents: breakdown.payoutCents,
          released_at: nowIso,
        })
        .eq("id", p.id)
        .eq("escrow_status", "held")
        .select("id");
      if (!claimed?.length) continue;

      if (finalTransfer > 0) {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: finalTransfer,
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
            .update({
              escrow_status: "held",
              released_cents: alreadyReleased,
              released_at: null,
            })
            .eq("id", p.id);
          throw e;
        }
      }

      // Prévient le coach du versement (avec la commission prélevée et le
      // rappel « 0 % en Pro » pour les coachs Gratuit). Différé après le lot.
      if (finalTransfer > 0) {
        const coachEmail = coachEmailById.get(p.coach_id as string);
        if (coachEmail) {
          const eurosStr = (cents: number) =>
            (cents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            });
          const cl0 = Array.isArray(bookingRow?.clients)
            ? bookingRow?.clients[0]
            : bookingRow?.clients;
          const clientLabel =
            [cl0?.first_name, cl0?.last_name].filter(Boolean).join(" ") ||
            "ton client";
          const tpl = payoutReleasedCoach({
            locale: coach.locale === "en" ? "en" : "fr",
            clientName: clientLabel,
            payoutStr: eurosStr(finalTransfer),
            dashboardUrl: `${APP_URL}/dashboard/paiements`,
            commissionStr:
              breakdown.commissionCents > 0
                ? eurosStr(breakdown.commissionCents)
                : undefined,
          });
          emailJobs.push(() =>
            sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html })
          );
        }
      }

      if (p.booking_id) {
        await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("id", p.booking_id)
          .neq("status", "cancelled");

        // Invite le client à noter sa séance (1 client = 1 avis). Différé.
        const cl = Array.isArray(bookingRow?.clients)
          ? bookingRow?.clients[0]
          : bookingRow?.clients;
        const co = Array.isArray(bookingRow?.coaches)
          ? bookingRow?.coaches[0]
          : bookingRow?.coaches;
        const bkId = p.booking_id as string;
        if (cl?.email) {
          const clEmail = cl.email as string;
          const tpl = reviewRequestClient({
            coachName:
              [co?.first_name, co?.last_name].filter(Boolean).join(" ") ||
              "ton coach",
            reservationUrl: `${APP_URL}/reservation/${bkId}`,
          });
          emailJobs.push(() =>
            sendEmail({ to: clEmail, subject: tpl.subject, html: tpl.html })
          );
        }
      }
      released++;
    } catch (e) {
      skipIds.add(p.id as string);
      errors.push(`${p.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // Les débits du lot sont faits : on envoie les emails en parallèle.
  await Promise.allSettled(emailJobs.map((job) => job()));
  }

  return NextResponse.json({ released, refunded, expired, errors });
}
