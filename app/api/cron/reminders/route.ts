import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { sessionReminderClient } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Job planifié : envoie un rappel par email aux clients dont la séance a lieu
// dans les ~24 h à venir et qui n'ont pas encore été rappelés. Sécurisé par
// CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
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

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, location, reminder_sent_at, status, clients(first_name, email), coaches(first_name, last_name)"
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("starts_at", nowIso)
    .lte("starts_at", soon)
    .limit(200);

  let sent = 0;
  for (const b of bookings ?? []) {
    const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
    const coach = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
    const email = client?.email as string | undefined;
    // On marque comme rappelé même sans email pour ne pas réessayer en boucle.
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
      });
      const t = sessionReminderClient({
        coachName,
        dateStr,
        online: b.location === "online",
        reservationUrl: `${APP_URL}/reservation/${b.id}`,
      });
      const ok = await sendEmail({ to: email, subject: t.subject, html: t.html });
      if (ok) sent++;
    }
    await supabase
      .from("bookings")
      .update({ reminder_sent_at: nowIso })
      .eq("id", b.id);
  }

  return NextResponse.json({ sent, scanned: (bookings ?? []).length });
}
