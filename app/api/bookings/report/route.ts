import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import {
  disputeOpenedAdmin,
  disputeOpenedCoach,
  disputeReceivedClient,
} from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Rate limit en mémoire par IP (best-effort, même patron que booking-request).
// La route est non authentifiée et gèle les fonds d'un coach : sans limite,
// quiconque connaît un booking_id + l'email du client peut spammer le gel.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 h
const RATE_MAX = 5; // 5 signalements / h / IP
const rateMap = new Map<string, { count: number; start: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

// Un client signale un problème sur une séance payée. Tant que les fonds ne sont
// pas libérés, ils sont GELÉS (escrow_status = 'disputed') jusqu'à la décision
// d'un admin (cf. charte). Vérification légère : l'e-mail doit correspondre à
// celui du client de la réservation (l'action ne déplace aucun argent, elle ne
// fait que bloquer — un admin tranche ensuite).
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  const email = (body.email as string | undefined)?.trim().toLowerCase();
  const reason = (body.reason as string | undefined)?.slice(0, 1000) || null;
  if (!bookingId || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: payment } = await supabase
    .from("payments")
    .select("id, client_id, coach_id, amount_cents, currency, escrow_status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (payment.escrow_status !== "held") {
    // Déjà libéré, remboursé ou déjà en litige : plus rien à geler.
    return NextResponse.json({ error: "not_disputable" }, { status: 409 });
  }

  // Vérifie que l'e-mail correspond au client de la réservation.
  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", payment.client_id)
    .maybeSingle();
  if (!client?.email || client.email.trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  await supabase
    .from("payments")
    .update({
      escrow_status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: reason,
    })
    .eq("id", payment.id);

  // Emails de litige (best-effort) : alerte admins, information du coach
  // (versement gelé) et accusé de réception au client.
  try {
    const { data: coach } = await supabase
      .from("coaches")
      .select("first_name, last_name, locale")
      .eq("id", payment.coach_id)
      .maybeSingle();
    const { data: clientRow } = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", payment.client_id)
      .maybeSingle();
    const clientName =
      [clientRow?.first_name, clientRow?.last_name].filter(Boolean).join(" ") ||
      "Client";
    const coachName =
      [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Coach";
    const coachLocale = coach?.locale === "en" ? ("en" as const) : ("fr" as const);
    const amountStr = (payment.amount_cents / 100).toLocaleString(
      coachLocale === "en" ? "en-GB" : "fr-FR",
      {
        style: "currency",
        currency: (payment.currency || "eur").toUpperCase(),
      }
    );
    // Montant formaté en français pour les emails admin + client (FR).
    const amountStrFr = (payment.amount_cents / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: (payment.currency || "eur").toUpperCase(),
    });

    const admins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (admins.length) {
      const tpl = disputeOpenedAdmin({
        clientName,
        coachName,
        amountStr: amountStrFr,
        reason,
        adminUrl: `${APP_URL}/admin/litiges`,
      });
      for (const to of admins) {
        await sendEmail({ to, subject: tpl.subject, html: tpl.html });
      }
    }

    // Coach : son versement est gelé le temps de l'examen (ton neutre).
    try {
      const { data: coachAuth } = await supabase.auth.admin.getUserById(
        payment.coach_id as string
      );
      if (coachAuth?.user?.email) {
        const tpl = disputeOpenedCoach({
          locale: coachLocale,
          clientName,
          amountStr,
          dashboardUrl: `${APP_URL}/dashboard/paiements`,
        });
        await sendEmail({
          to: coachAuth.user.email,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: "contact@madger.app",
        });
      }
    } catch {
      /* best-effort */
    }

    // Client : accusé de réception (son email vient d'être vérifié ci-dessus).
    try {
      const tpl = disputeReceivedClient({
        coachName,
        amountStr: amountStrFr,
        reservationUrl: `${APP_URL}/reservation/${bookingId}`,
      });
      await sendEmail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        replyTo: "contact@madger.app",
      });
    } catch {
      /* best-effort */
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
