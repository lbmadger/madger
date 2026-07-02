import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import {
  requestReceivedClient,
  newRequestCoach,
} from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Point d'entrée de la réservation publique. Le formulaire passe par ici (et
// non plus directement par la fonction Supabase) pour bénéficier d'un filtrage
// avant la base : limite par IP, piège à bots (honeypot) et validation. La
// base garde en plus ses propres plafonds (migration 0006) au cas où on
// appellerait la fonction directement.

export const dynamic = "force-dynamic";

// Rate limit en mémoire par IP (best-effort, comme la route early-access).
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 h
const RATE_MAX = 10; // 10 demandes / h / IP
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = {
  first_name: 80,
  last_name: 80,
  email: 254,
  phone: 30,
  message: 2000,
};

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();

    // Honeypot : champ invisible. Rempli = bot → faux succès, rien n'est créé.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const {
      coach_slug,
      first_name,
      last_name,
      email,
      phone,
      starts_at,
      duration_min,
      message,
      online,
    } = body;

    if (!coach_slug || !first_name || !email || !starts_at) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (!EMAIL_RE.test(String(email))) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    for (const [field, max] of Object.entries(MAX)) {
      const v = body[field];
      if (v != null && (typeof v !== "string" || v.length > max)) {
        return NextResponse.json({ error: "invalid_input" }, { status: 400 });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: bookingId, error } = await supabase.rpc("request_booking", {
      coach_slug: String(coach_slug),
      client_first_name: String(first_name),
      client_last_name: last_name ? String(last_name) : null,
      client_email: String(email),
      client_phone: phone ? String(phone) : null,
      starts_at: String(starts_at),
      duration_min: Number(duration_min) || 60,
      message: message ? String(message) : null,
      online: Boolean(online),
    });

    if (error) {
      const m = error.message || "";
      // Trace serveur (visible dans les logs Vercel) pour diagnostiquer.
      console.error("request_booking failed:", m, error.code, error.details);
      if (m.includes("rate_limited")) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      if (m.includes("date_in_past")) {
        return NextResponse.json({ error: "date_in_past" }, { status: 400 });
      }
      if (m.includes("coach_not_found")) {
        return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
      }
      return NextResponse.json(
        // `detail` est affiché en petit dans le formulaire : il donne la
        // cause technique exacte sans exposer de secret.
        { error: "server_error", detail: m.slice(0, 200) },
        { status: 500 }
      );
    }

    // ── Emails (best-effort) : confirmation au client + alerte au coach ────
    try {
      const { data: coach } = await supabase
        .from("public_coaches")
        .select("id, first_name, last_name, booking_mode")
        .eq("slug", String(coach_slug))
        .maybeSingle();
      if (coach) {
        const instant = coach.booking_mode === "instant";
        const coachName =
          [coach.first_name, coach.last_name].filter(Boolean).join(" ") ||
          "Ton coach";
        const dateStr = new Date(String(starts_at)).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });

        const tplClient = requestReceivedClient({
          coachName,
          dateStr,
          instant,
          reservationUrl: `${APP_URL}/reservation/${bookingId}`,
        });
        await sendEmail({
          to: String(email),
          subject: tplClient.subject,
          html: tplClient.html,
        });

        // Email du coach : compte auth (service role requis).
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
          const admin = createClient(SUPABASE_URL, serviceKey);
          const { data: u } = await admin.auth.admin.getUserById(
            coach.id as string
          );
          if (u?.user?.email) {
            const tplCoach = newRequestCoach({
              clientName: [first_name, last_name].filter(Boolean).join(" "),
              dateStr,
              online: Boolean(online),
              instant,
              dashboardUrl: `${APP_URL}/dashboard/agenda`,
            });
            await sendEmail({
              to: u.user.email,
              subject: tplCoach.subject,
              html: tplCoach.html,
            });
          }
        }
      }
    } catch {
      /* un échec d'email ne bloque jamais la demande */
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
