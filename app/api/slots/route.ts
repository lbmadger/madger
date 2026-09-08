import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { computeFreeSlots } from "@/lib/booking/freeSlots";

export const dynamic = "force-dynamic";

// Créneaux réellement réservables d'un coach sur les 14 prochains jours :
// disponibilités récurrentes − séances déjà prises − cours collectifs −
// verrous de paiement (calcul partagé : lib/booking/freeSlots). Pas de
// coordonnées brutes exposées : on ne renvoie que des créneaux.
//
// GET /api/slots?coach=<slug>&duration=<min>
// → { mode: "slots", days: [{ date, slots: [{ iso, label }] }] }
// → { mode: "free" } si le coach n'a défini aucune disponibilité (saisie libre)

const DAYS_AHEAD = 14;

export async function GET(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  // Libellés d'heures dans la langue du visiteur (14:30 vs 2:30 PM).
  const localeTag = searchParams.get("locale") === "en" ? "en-GB" : "fr-FR";
  const slug = searchParams.get("coach");
  const duration = Math.min(240, Math.max(15, Number(searchParams.get("duration")) || 60));
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
  const tz = (coach.timezone as string | null) || "Europe/Paris";

  const result = await computeFreeSlots(
    supabase,
    {
      id: coach.id as string,
      timezone: tz,
      min_notice_hours: coach.min_notice_hours as number | null,
    },
    { durationMin: duration, daysAhead: DAYS_AHEAD }
  );
  if (result.mode === "free") {
    return NextResponse.json({ mode: "free" });
  }
  const fmt = new Intl.DateTimeFormat(localeTag, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return NextResponse.json({
    mode: "slots",
    days: result.days.map((d) => ({
      date: d.date,
      slots: d.starts.map((s) => ({ iso: s.toISOString(), label: fmt.format(s) })),
    })),
  });
}
