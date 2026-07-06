import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { sessionReminderClient } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Job planifié : envoie un rappel par email aux clients dont la séance a lieu
// dans les ~24 h à venir et qui n'ont pas encore été rappelés.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const now = Date.now();
  const soon = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Traité PAR LOTS jusqu'à épuisement (ou fin du budget temps) : tous les
  // rappels du jour partent, quel que soit le nombre de coachs. Les envois
  // en échec (quota email…) ne sont pas marqués et repasseront.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  let sent = 0;
  let scanned = 0;
  const skipIds = new Set<string>();

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        "id, starts_at, location, meeting_url, reminder_sent_at, status, clients(first_name, email), coaches(first_name, last_name)"
      )
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
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
      const dateStr = new Date(b.starts_at as string).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      });
      const t = sessionReminderClient({
        coachName,
        dateStr,
        online: b.location === "online",
        reservationUrl: `${APP_URL}/reservation/${b.id}`,
        meetUrl:
          b.location === "online"
            ? (b.meeting_url as string | null) ?? undefined
            : undefined,
      });
      delivered = await sendEmail({ to: email, subject: t.subject, html: t.html });
      if (delivered) sent++;
    }
    // Marqué rappelé seulement si l'email est parti (ou s'il n'y a pas
    // d'adresse : inutile de rescanner la ligne à chaque run).
    if (delivered || !email) {
      await supabase
        .from("bookings")
        .update({ reminder_sent_at: nowIso })
        .eq("id", b.id);
    } else {
      // Échec d'envoi : écarté du run courant, retenté au prochain.
      skipIds.add(b.id as string);
    }
  }
  }

  return NextResponse.json({ sent, scanned });
}
