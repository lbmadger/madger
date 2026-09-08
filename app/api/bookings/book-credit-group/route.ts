import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { notifyClient } from "@/lib/notifications/client";
import {
  packSessionBookedClient,
  packSessionBookedCoach,
} from "@/lib/email/templates";
import { dateISOInTz, weekdayInTz } from "@/lib/time/tz";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

function weekKey(d: Date, tz: string): string {
  const weekday = weekdayInTz(d, tz);
  const monday = new Date(d.getTime() - ((weekday + 6) % 7) * 86400000);
  return dateISOInTz(monday, tz);
}

// Le CLIENT place une place d'un pack COLLECTIF sur un cours planifié par le
// coach. Le pack doit être rattaché à la prestation du cours ; la place est
// attribuée atomiquement (group_seat_book), le crédit débité sur CE pack,
// puis la place confirmée (un cours est toujours en confirmation immédiate).
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const packId = body.pack_id as string | undefined;
  const sessionId = body.group_session_id as string | undefined;
  if (!packId || !sessionId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: pack } = await admin
    .from("pack_credits")
    .select(
      "id, coach_id, client_id, total, used, status, expires_at, max_per_week, service_id, services(group_service_id), clients(email, first_name, last_name)"
    )
    .eq("id", packId)
    .maybeSingle();
  if (!pack) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const client = Array.isArray(pack.clients) ? pack.clients[0] : pack.clients;
  if (
    !client?.email ||
    String(client.email).trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const svc = Array.isArray(pack.services) ? pack.services[0] : pack.services;
  const groupServiceId = (svc?.group_service_id as string | null) ?? null;
  if (!groupServiceId) {
    return NextResponse.json({ error: "not_group_pack" }, { status: 409 });
  }
  if (
    pack.status !== "active" ||
    (pack.expires_at && new Date(pack.expires_at as string).getTime() < Date.now())
  ) {
    return NextResponse.json({ error: "pack_inactive" }, { status: 409 });
  }
  if ((pack.total as number) - (pack.used as number) <= 0) {
    return NextResponse.json({ error: "no_credit" }, { status: 409 });
  }

  const { data: session } = await admin
    .from("group_sessions")
    .select("id, coach_id, service_id, name, starts_at, ends_at, capacity, status, location, location_text")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.coach_id !== pack.coach_id || session.status !== "scheduled") {
    return NextResponse.json({ error: "session_unavailable" }, { status: 409 });
  }
  if (session.service_id !== groupServiceId) {
    return NextResponse.json({ error: "wrong_service" }, { status: 409 });
  }
  const { data: coach } = await admin
    .from("coaches")
    .select("first_name, last_name, min_notice_hours, timezone, locale")
    .eq("id", pack.coach_id)
    .maybeSingle();
  const noticeMs = ((coach?.min_notice_hours as number) || 2) * 3600000;
  const starts = new Date(session.starts_at as string);
  if (starts.getTime() < Date.now() + noticeMs) {
    return NextResponse.json({ error: "too_soon" }, { status: 409 });
  }

  // Limite hebdomadaire du pack.
  const maxPerWeek = (pack.max_per_week as number | null) ?? null;
  const tz = (coach?.timezone as string | null) || "Europe/Paris";
  if (maxPerWeek) {
    const { data: existing } = await admin
      .from("bookings")
      .select("starts_at")
      .eq("pack_credit_id", pack.id)
      .in("status", ["pending", "confirmed", "completed"]);
    const k = weekKey(starts, tz);
    const inWeek = (existing ?? []).filter(
      (b) => weekKey(new Date(b.starts_at as string), tz) === k
    ).length;
    if (inWeek >= maxPerWeek) {
      return NextResponse.json({ error: "max_per_week", max_per_week: maxPerWeek }, { status: 409 });
    }
  }

  // Place attribuée sous verrou (complet / déjà inscrit → erreur explicite).
  const { data: bookingId, error: seatError } = await admin.rpc("group_seat_book", {
    p_session: session.id,
    p_client: pack.client_id,
    p_notes: null,
    p_status: "pending",
  });
  if (seatError || !bookingId) {
    const msg = seatError?.message ?? "";
    const code = /session_full/.test(msg)
      ? "session_full"
      : /already_booked/.test(msg)
      ? "already_booked"
      : /session_unavailable/.test(msg)
      ? "session_unavailable"
      : "generic";
    return NextResponse.json({ error: code }, { status: 409 });
  }
  const { data: creditId } = await admin.rpc("pack_credit_consume_from", {
    p_pack: pack.id,
    p_booking: bookingId,
    p_actor: "client",
  });
  if (!creditId) {
    await admin.from("bookings").delete().eq("id", bookingId);
    return NextResponse.json({ error: "no_credit" }, { status: 409 });
  }
  await admin.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);

  const remaining = Math.max(0, (pack.total as number) - (pack.used as number) - 1);

  // Emails et cloche (best-effort).
  try {
    const coachName =
      [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach";
    const clientName =
      [client.first_name, client.last_name].filter(Boolean).join(" ") || "Ton client";
    const fmt = (loc: "fr" | "en") =>
      starts.toLocaleString(loc === "en" ? "en-GB" : "fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      });
    const online = session.location === "online";
    const tplClient = packSessionBookedClient({
      coachName,
      dates: [`${session.name} · ${fmt("fr")}`],
      confirmed: true,
      remaining,
      online,
      placeStr: online ? undefined : (session.location_text as string | null) ?? undefined,
      spaceUrl: `${APP_URL}/espace`,
    });
    await sendEmail({ to: user.email, subject: tplClient.subject, html: tplClient.html });
    await notifyClient(admin, {
      email: user.email,
      type: "booked",
      coachName,
      startsAt: session.starts_at as string,
      bookingId: bookingId as string,
    });
    const { data: coachAuth } = await admin.auth.admin.getUserById(pack.coach_id as string);
    if (coachAuth?.user?.email) {
      const coachLocale = coach?.locale === "en" ? ("en" as const) : ("fr" as const);
      const tplCoach = packSessionBookedCoach({
        locale: coachLocale,
        clientName,
        dates: [`${session.name} · ${fmt(coachLocale)}`],
        confirmed: true,
        remaining,
        dashboardUrl: `${APP_URL}/dashboard/agenda`,
      });
      await sendEmail({ to: coachAuth.user.email, subject: tplCoach.subject, html: tplCoach.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, booking_id: bookingId, remaining });
}
