import { NextRequest, NextResponse } from "next/server";
import { coachPlaceStr } from "@/lib/coach/place";
import { createClient } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { sessionReminderSoonClient } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";
import { getStripe } from "@/lib/stripe/server";
import { performClientCancellation } from "@/lib/booking/clientCancel";
import {
  cancelRequestDeadline,
  clampCancelHours,
  creditRestoredIfCancelled,
  refundCents,
  resolveRefundPolicy,
} from "@/lib/booking/cancellation";
import { clientCancelReminderClient } from "@/lib/email/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Rappel « ~1 h avant » : email aux clients dont la séance commence dans les
// ~65 min à venir et qui n'ont pas encore reçu ce second rappel. À déclencher
// souvent (toutes les 15-30 min) via un cron externe, car Vercel Hobby ne
// permet que 2 crons planifiés (déjà pris par release + reminders 24 h).
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, NO_STORE);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // ── Demandes d'annulation sans réponse : relance à 24 h ───────────────────
  // Une seule relance, avec ce qui se passe s'il confirme et la date à
  // laquelle l'annulation sera confirmée d'office. Best-effort.
  let cancelReminders = 0;
  try {
    const { data: toRemind } = await supabase
      .from("bookings")
      .select(
        "id, coach_id, client_id, starts_at, pack_credit_id, client_cancel_requested_at, pack_credits(cancel_hours), coaches(first_name, last_name, timezone, pro_until, pro_bonus_until, cancellation_policy, refund_over_24h_pct, refund_under_24h_pct, cancel_hours), clients(email)"
      )
      .eq("status", "confirmed")
      .not("client_cancel_requested_at", "is", null)
      .is("client_cancel_reminded_at", null)
      .lte("client_cancel_requested_at", new Date(now - 24 * 3_600_000).toISOString())
      .gt("starts_at", nowIso)
      .limit(50);
    for (const b of toRemind ?? []) {
      const deadline = cancelRequestDeadline(
        b.client_cancel_requested_at as string,
        b.starts_at as string
      );
      // Échéance déjà passée : la résolution automatique s'en charge.
      if (deadline.getTime() <= now) continue;
      const coach = (Array.isArray(b.coaches) ? b.coaches[0] : b.coaches) as Record<string, unknown> | null;
      const client = (Array.isArray(b.clients) ? b.clients[0] : b.clients) as { email?: string } | null;
      const tz = (coach?.timezone as string | null) || "Europe/Paris";
      const fmt = (d: Date | string) =>
        new Date(d).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: tz,
        });
      let outcome: string;
      if (b.pack_credit_id) {
        const pc = (Array.isArray(b.pack_credits) ? b.pack_credits[0] : b.pack_credits) as { cancel_hours?: number | null } | null;
        const hours = clampCancelHours(pc?.cancel_hours);
        outcome = creditRestoredIfCancelled(hours, new Date(b.starts_at as string), new Date(b.client_cancel_requested_at as string))
          ? "ta séance est rendue à ton pack"
          : `ta séance est décomptée de ton pack (moins de ${hours} h avant)`;
      } else {
        const { data: pay } = await supabase
          .from("payments")
          .select("amount_cents, released_cents, refunded_cents, currency")
          .eq("booking_id", b.id)
          .maybeSingle();
        const amount = (pay?.amount_cents as number | null) ?? 0;
        const ceiling = Math.max(0, amount - ((pay?.released_cents as number | null) ?? 0) - ((pay?.refunded_cents as number | null) ?? 0));
        const refund = Math.min(
          refundCents(resolveRefundPolicy(coach), new Date(b.starts_at as string), amount, new Date(b.client_cancel_requested_at as string)),
          ceiling
        );
        const euros = (c: number) =>
          (c / 100).toLocaleString("fr-FR", { style: "currency", currency: ((pay?.currency as string) || "eur").toUpperCase() });
        outcome =
          amount <= 0
            ? "aucun paiement en jeu"
            : refund > 0
            ? `remboursement de ${euros(refund)} sur ${euros(amount)}`
            : "pas de remboursement cette fois, l'annulation est trop proche de la séance (politique du coach)";
      }
      let delivered = true;
      if (client?.email) {
        const tpl = clientCancelReminderClient({
          coachName: [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach",
          dateStr: fmt(b.starts_at as string),
          outcome,
          deadlineStr: fmt(deadline),
          url: `${APP_URL}/espace`,
        });
        delivered = await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
        if (delivered) cancelReminders++;
      }
      if (delivered) {
        await supabase.from("bookings").update({ client_cancel_reminded_at: nowIso }).eq("id", b.id);
      }
    }
  } catch (e) {
    console.error("cancel-reminder:", e instanceof Error ? e.message : e);
  }

  // ── Demandes d'annulation sans réponse du client : confirmées d'office ────
  // (migration 0083). 48 h après la demande du coach, ou 1 h avant la séance
  // si c'est plus tôt : l'annulation client est exécutée (formule à l'heure
  // de la demande), le client reçoit l'email d'annulation, le créneau se
  // libère. Best-effort, une séance à la fois.
  let autoCancelled = 0;
  try {
    const stripe = getStripe();
    const { data: pending } = await supabase
      .from("bookings")
      .select("id, starts_at, client_cancel_requested_at")
      .eq("status", "confirmed")
      .not("client_cancel_requested_at", "is", null)
      .gt("starts_at", nowIso)
      .limit(50);
    for (const b of pending ?? []) {
      const deadline = cancelRequestDeadline(
        b.client_cancel_requested_at as string,
        b.starts_at as string
      );
      if (deadline.getTime() > now || !stripe) continue;
      const result = await performClientCancellation(supabase, stripe, {
        bookingId: b.id as string,
        clientEmail: null,
      });
      if (result.status === 200) autoCancelled++;
      else console.error("auto-cancel failed:", b.id, result.body);
    }
  } catch (e) {
    console.error("auto-cancel:", e instanceof Error ? e.message : e);
  }

  // ── Reports sans réponse du client : validation automatique ───────────────
  // (migration 0057). Ce cron tourne toutes les 15 min : la fenêtre de 48 h
  // est respectée au quart d'heure près. Best-effort.
  let autoValidated = 0;
  try {
    const { data: done } = await supabase
      .from("bookings")
      .update({ reschedule_pending_until: null, rescheduled_from: null })
      .not("reschedule_pending_until", "is", null)
      .lte("reschedule_pending_until", nowIso)
      .select("id");
    autoValidated = done?.length ?? 0;
  } catch {
    /* colonne absente : migration pas encore passée */
  }
  // Fenêtre : séances qui démarrent dans les ~65 min. Toute cadence de cron
  // ≤ 60 min couvre alors chaque séance au moins une fois avant le début.
  const soon = new Date(now + 65 * 60 * 1000).toISOString();

  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  let sent = 0;
  let scanned = 0;
  const skipIds = new Set<string>();

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        "id, starts_at, location, meeting_url, reminder_soon_sent_at, status, clients(first_name, email), coaches(first_name, last_name, timezone, gym_name, gym_address, outdoor_address)"
      )
      .eq("status", "confirmed")
      .eq("is_block", false)
      .is("reminder_soon_sent_at", null)
      .gt("starts_at", nowIso)
      .lte("starts_at", soon)
      .limit(100);
    const batch = (bookings ?? []).filter((b) => !skipIds.has(b.id as string));
    if (batch.length === 0) break;
    scanned += batch.length;

    for (const b of batch) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
      const coach = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
      const email = client?.email as string | undefined;
      let delivered = false;
      if (email) {
        const coachName =
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
          "ton coach";
        const timeStr = new Date(b.starts_at as string).toLocaleTimeString(
          "fr-FR",
          {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: (coach?.timezone as string | null) || "Europe/Paris",
          }
        );
        const online = b.location === "online";
        const address = !online ? coachPlaceStr(coach) ?? undefined : undefined;
        const t = sessionReminderSoonClient({
          coachName,
          timeStr,
          online,
          reservationUrl: `${APP_URL}/reservation/${b.id}`,
          meetUrl: online
            ? (b.meeting_url as string | null) ?? undefined
            : undefined,
          address,
        });
        delivered = await sendEmail({ to: email, subject: t.subject, html: t.html });
        if (delivered) sent++;
      }
      if (delivered || !email) {
        await supabase
          .from("bookings")
          .update({ reminder_soon_sent_at: nowIso })
          .eq("id", b.id);
      } else {
        skipIds.add(b.id as string);
      }
    }
  }

  return NextResponse.json({ sent, scanned, autoValidated, autoCancelled, cancelReminders });
}
