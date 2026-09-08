import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Liste d'attente sur un créneau pris (migration 0070). Route publique :
// le visiteur laisse son email sur un créneau complet, il est prévenu si la
// séance est annulée (lib/waitlist/notify.ts). Rate limit mémoire par IP,
// même patron que le signalement de séance.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 10;
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
  const slug = String(body.coach ?? "").trim();
  const startsAt = String(body.starts_at ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const firstName = String(body.first_name ?? "").trim().slice(0, 60) || null;
  const start = new Date(startsAt);
  if (!slug || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (start.getTime() < Date.now()) {
    return NextResponse.json({ error: "slot_past" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("slug", slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  }

  // Le créneau doit être réellement pris : sinon il suffit de réserver.
  const { data: busy } = await supabase
    .from("bookings")
    .select("id")
    .eq("coach_id", coach.id)
    .in("status", ["pending", "confirmed"])
    .lte("starts_at", start.toISOString())
    .gt("ends_at", start.toISOString())
    .limit(1);
  if (!busy?.length) {
    return NextResponse.json({ error: "slot_free" }, { status: 409 });
  }

  const { error } = await supabase
    .from("slot_waitlist")
    .upsert(
      { coach_id: coach.id, starts_at: start.toISOString(), email, first_name: firstName },
      { onConflict: "coach_id,starts_at,email", ignoreDuplicates: true }
    );
  if (error) {
    // Index unique sur lower(email) : un doublon à casse différente n'est pas
    // une erreur pour le visiteur.
    if (error.code === "23505") return NextResponse.json({ ok: true, already: true });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
