import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { clientRescheduleAnswerCoach } from "@/lib/email/templates";
import {
  attachMeetToBooking,
  detachMeetFromBooking,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Réponse du CLIENT à un report décidé par le coach (migration 0057) :
//  - confirm : le nouvel horaire est validé, la proposition est close ;
//  - move    : le client choisit un autre créneau (dans les disponibilités
//              du coach), la séance est déplacée et le coach prévenu.
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
  const bookingId = body.booking_id as string | undefined;
  const action = body.action === "move" ? "move" : "confirm";
  const startsAtRaw = body.starts_at as string | undefined;
  if (!bookingId || (action === "move" && !startsAtRaw)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, coach_id, client_id, starts_at, ends_at, status, reschedule_pending_until"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: clientRow } = await admin
    .from("clients")
    .select("id, email, first_name, last_name")
    .eq("id", booking.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: coach } = await admin
    .from("coaches")
    .select("first_name, last_name, timezone, locale, min_notice_hours")
    .eq("id", booking.coach_id)
    .maybeSingle();

  const clear = { reschedule_pending_until: null, rescheduled_from: null };

  if (action === "confirm") {
    await admin.from("bookings").update(clear).eq("id", bookingId);
    return NextResponse.json({ ok: true });
  }

  // ── Déplacement vers le créneau choisi par le client ─────────────────────
  const starts = new Date(String(startsAtRaw));
  if (Number.isNaN(starts.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  const durationMs =
    new Date(booking.ends_at as string).getTime() -
    new Date(booking.starts_at as string).getTime();
  const ends = new Date(starts.getTime() + Math.max(15 * 60000, durationMs));
  const noticeMs = ((coach?.min_notice_hours as number) || 2) * 3600000;
  if (starts.getTime() < Date.now() + noticeMs) {
    return NextResponse.json({ error: "too_soon" }, { status: 409 });
  }
  const { data: overlapping } = await admin
    .from("bookings")
    .select("id")
    .eq("coach_id", booking.coach_id)
    .in("status", ["pending", "confirmed"])
    .neq("id", bookingId)
    .lt("starts_at", ends.toISOString())
    .gt("ends_at", starts.toISOString())
    .limit(1);
  if ((overlapping ?? []).length > 0) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  const previousStart = booking.starts_at as string;
  const { data: moved } = await admin
    .from("bookings")
    .update({
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      reminder_sent_at: null,
      reminder_soon_sent_at: null,
      ...clear,
    })
    .eq("id", bookingId)
    .neq("status", "cancelled")
    .select("id");
  if (!moved?.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Le séquestre suit la séance (comme lors d'un report par le coach).
  await admin
    .from("payments")
    .update({
      release_after: new Date(ends.getTime() + 24 * 3600 * 1000).toISOString(),
    })
    .eq("booking_id", bookingId)
    .eq("escrow_status", "held");

  // Agenda Google + email au coach (best-effort).
  try {
    await detachMeetFromBooking(admin, bookingId);
    if (booking.status === "confirmed") {
      await attachMeetToBooking(admin, {
        bookingId,
        coachId: booking.coach_id as string,
        starts,
        ends,
        clientEmail: clientRow.email,
      });
    }
    const { data: coachAuth } = await admin.auth.admin.getUserById(
      booking.coach_id as string
    );
    const coachEmail = coachAuth?.user?.email;
    if (coachEmail) {
      const coachLocale = coach?.locale === "en" ? ("en" as const) : ("fr" as const);
      const fmt = (iso: string) =>
        new Date(iso).toLocaleString(coachLocale === "en" ? "en-GB" : "fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: (coach?.timezone as string | null) || "Europe/Paris",
        });
      const tpl = clientRescheduleAnswerCoach({
        locale: coachLocale,
        clientName:
          [clientRow.first_name, clientRow.last_name].filter(Boolean).join(" ") ||
          (coachLocale === "en" ? "Your client" : "Ton client"),
        oldDateStr: fmt(previousStart),
        dateStr: fmt(starts.toISOString()),
        dashboardUrl: `${APP_URL}/dashboard/agenda`,
      });
      await sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
