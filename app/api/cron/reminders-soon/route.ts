import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { sessionReminderSoonClient } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";

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

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
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
        "id, starts_at, location, meeting_url, reminder_soon_sent_at, status, clients(first_name, email), coaches(first_name, last_name, timezone, gym_name, gym_address)"
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
        const address =
          !online && coach?.gym_address
            ? [coach.gym_name, coach.gym_address].filter(Boolean).join(" · ")
            : undefined;
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

  return NextResponse.json({ sent, scanned });
}
