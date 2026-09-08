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
// → { mode: "slots", days: [{ date, slots: [{ iso, label }], taken: [{ iso, label }] }] }
//   `taken` : créneaux dans les disponibilités mais déjà pris, proposés en
//   liste d'attente (migration 0068).
// → { mode: "free" } si le coach n'a défini aucune disponibilité (saisie libre)

const DAYS_AHEAD = 14;
const STEP_MIN = 30; // un créneau proposé toutes les 30 min

type Slot = { iso: string; label: string };

export async function GET(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  // Libellés d'heures dans la langue du visiteur (14:30 vs 2:30 PM).
  const localeTag =
    searchParams.get("locale") === "en" ? "en-GB" : "fr-FR";
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
    .select("id, timezone, min_notice_hours")
    .eq("slug", slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  }
  const tz = coach.timezone || "Europe/Paris";
  // Préavis minimum choisi par le coach (réglages) : en deçà, le créneau
  // n'est plus proposé.
  const noticeMs = ((coach.min_notice_hours as number) || 2) * 3600000;

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

  // Créneaux VERROUILLÉS (paiement en cours, migration 0052) : retirés de
  // l'affichage pendant 15 min. Défensif : table absente = simplement ignoré.
  const { data: holds, error: holdsError } = await supabase
    .from("slot_holds")
    .select("starts_at, ends_at")
    .eq("coach_id", coach.id)
    .gte("created_at", new Date(now.getTime() - 15 * 60 * 1000).toISOString());
  if (!holdsError) {
    for (const h of holds ?? []) {
      busy.push({
        start: new Date(h.starts_at).getTime(),
        end: new Date(h.ends_at).getTime(),
      });
    }
  }

  const minStart = now.getTime() + noticeMs;
  const days: { date: string; slots: Slot[]; taken: Slot[] }[] = [];

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const dayRef = new Date(now.getTime() + d * 86400000);
    const dateISO = dateISOInTz(dayRef, tz);
    const weekday = weekdayInTz(dayRef, tz);
    const windows = avail.filter((a) => a.weekday === weekday);
    const slots: Slot[] = [];
    const taken: Slot[] = [];

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
        const label = new Intl.DateTimeFormat(localeTag, {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(t));
        if (busy.some((b) => t < b.end && end > b.start)) {
          // Pris : proposé en liste d'attente, à condition de ne pas
          // chevaucher un créneau libre déjà listé (pas de pas de 30 min
          // « pris » entre deux libres qui se touchent).
          if (!taken.some((x) => x.iso === new Date(t).toISOString()))
            taken.push({ iso: new Date(t).toISOString(), label });
          continue;
        }
        slots.push({ iso: new Date(t).toISOString(), label });
      }
    }

    slots.sort((a, b) => a.iso.localeCompare(b.iso));
    taken.sort((a, b) => a.iso.localeCompare(b.iso));
    days.push({ date: dateISO, slots, taken });
  }

  return NextResponse.json({ mode: "slots", days });
}
