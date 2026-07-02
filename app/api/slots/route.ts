import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { zonedToUtc, weekdayInTz, dateISOInTz } from "@/lib/time/tz";

export const dynamic = "force-dynamic";

// Créneaux réellement réservables d'un coach sur les 14 prochains jours :
// disponibilités récurrentes − séances déjà prises (pending + confirmed).
// Pas de coordonnées brutes exposées : on ne renvoie que des créneaux.
//
// GET /api/slots?coach=<slug>&duration=<min>
// → { mode: "slots", days: [{ date, slots: [{ iso, label }] }] }
// → { mode: "free" } si le coach n'a défini aucune disponibilité (saisie libre)

const DAYS_AHEAD = 14;
const STEP_MIN = 30; // un créneau proposé toutes les 30 min
const MIN_NOTICE_MS = 60 * 60 * 1000; // préavis mini : 1 h

type Slot = { iso: string; label: string };

export async function GET(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("coach");
  const duration = Math.min(
    240,
    Math.max(15, Number(searchParams.get("duration")) || 60)
  );
  if (!slug) {
    return NextResponse.json({ error: "missing_coach" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, timezone")
    .eq("slug", slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  }
  const tz = coach.timezone || "Europe/Paris";

  const { data: avail } = await supabase
    .from("availabilities")
    .select("weekday, start_time, end_time")
    .eq("coach_id", coach.id);

  // Aucune dispo définie → le front repasse en saisie libre de date/heure.
  if (!avail || avail.length === 0) {
    return NextResponse.json({ mode: "free" });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + (DAYS_AHEAD + 1) * 86400000);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("starts_at, ends_at, status")
    .eq("coach_id", coach.id)
    .in("status", ["pending", "confirmed"])
    .gte("ends_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  const busy = (bookings ?? []).map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.ends_at).getTime(),
  }));

  const minStart = now.getTime() + MIN_NOTICE_MS;
  const days: { date: string; slots: Slot[] }[] = [];

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const dayRef = new Date(now.getTime() + d * 86400000);
    const dateISO = dateISOInTz(dayRef, tz);
    const weekday = weekdayInTz(dayRef, tz);
    const windows = avail.filter((a) => a.weekday === weekday);
    const slots: Slot[] = [];

    for (const w of windows) {
      const winStart = zonedToUtc(dateISO, w.start_time.slice(0, 5), tz);
      const winEnd = zonedToUtc(dateISO, w.end_time.slice(0, 5), tz);
      for (
        let t = winStart.getTime();
        t + duration * 60000 <= winEnd.getTime();
        t += STEP_MIN * 60000
      ) {
        const end = t + duration * 60000;
        if (t < minStart) continue;
        if (busy.some((b) => t < b.end && end > b.start)) continue;
        const label = new Intl.DateTimeFormat("fr-FR", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(t));
        slots.push({ iso: new Date(t).toISOString(), label });
      }
    }

    slots.sort((a, b) => a.iso.localeCompare(b.iso));
    days.push({ date: dateISO, slots });
  }

  return NextResponse.json({ mode: "slots", days });
}
