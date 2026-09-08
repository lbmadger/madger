import type { SupabaseClient } from "@supabase/supabase-js";
import { zonedToUtc, weekdayInTz, dateISOInTz } from "@/lib/time/tz";

// Créneaux réellement réservables d'un coach sur les prochains jours :
// disponibilités récurrentes − séances prises (pending + confirmed) − cours
// collectifs planifiés − verrous de paiement (15 min). Partagé entre l'API
// publique des créneaux et le cron de protection des packs (« le coach
// a-t-il encore des créneaux libres ? »).

export const STEP_MIN = 30; // un créneau proposé toutes les 30 min

export type FreeSlotDay = { date: string; starts: Date[] };

export async function computeFreeSlots(
  supabase: SupabaseClient,
  coach: { id: string; timezone?: string | null; min_notice_hours?: number | null },
  opts: { durationMin: number; daysAhead: number; now?: Date }
): Promise<{ mode: "free" } | { mode: "slots"; days: FreeSlotDay[]; total: number }> {
  const now = opts.now ?? new Date();
  const tz = coach.timezone || "Europe/Paris";
  const duration = Math.min(240, Math.max(15, opts.durationMin || 60));
  const noticeMs = (coach.min_notice_hours || 2) * 3600000;

  const { data: avail } = await supabase
    .from("availabilities")
    .select("weekday, start_time, end_time")
    .eq("coach_id", coach.id);
  // Aucune dispo définie → saisie libre côté client (pas de grille).
  if (!avail || avail.length === 0) return { mode: "free" };

  const horizon = new Date(now.getTime() + (opts.daysAhead + 1) * 86400000);
  const [{ data: bookings }, { data: groupSessions }, { data: holds }] = await Promise.all([
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("coach_id", coach.id)
      .in("status", ["pending", "confirmed"])
      .gte("ends_at", now.toISOString())
      .lte("starts_at", horizon.toISOString()),
    supabase
      .from("group_sessions")
      .select("starts_at, ends_at")
      .eq("coach_id", coach.id)
      .eq("status", "scheduled")
      .gte("ends_at", now.toISOString())
      .lte("starts_at", horizon.toISOString()),
    supabase
      .from("slot_holds")
      .select("starts_at, ends_at")
      .eq("coach_id", coach.id)
      .gte("created_at", new Date(now.getTime() - 15 * 60 * 1000).toISOString()),
  ]);
  const busy = [...(bookings ?? []), ...(groupSessions ?? []), ...(holds ?? [])].map((b) => ({
    start: new Date(b.starts_at as string).getTime(),
    end: new Date(b.ends_at as string).getTime(),
  }));

  const minStart = now.getTime() + noticeMs;
  const days: FreeSlotDay[] = [];
  let total = 0;
  for (let d = 0; d < opts.daysAhead; d++) {
    const dayRef = new Date(now.getTime() + d * 86400000);
    const dateISO = dateISOInTz(dayRef, tz);
    const weekday = weekdayInTz(dayRef, tz);
    const windows = avail.filter((a) => a.weekday === weekday);
    const starts: Date[] = [];
    for (const w of windows) {
      const winStart = zonedToUtc(dateISO, (w.start_time as string).slice(0, 5), tz);
      const winEnd = zonedToUtc(dateISO, (w.end_time as string).slice(0, 5), tz);
      for (
        let t = winStart.getTime();
        t + duration * 60000 <= winEnd.getTime();
        t += STEP_MIN * 60000
      ) {
        const end = t + duration * 60000;
        if (t < minStart) continue;
        if (busy.some((b) => t < b.end && end > b.start)) continue;
        starts.push(new Date(t));
      }
    }
    starts.sort((a, b) => a.getTime() - b.getTime());
    total += starts.length;
    days.push({ date: dateISO, starts });
  }
  return { mode: "slots", days, total };
}
