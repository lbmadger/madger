import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { bookingRescheduledClient } from "@/lib/email/templates";
import {
  attachMeetToBooking,
  detachMeetFromBooking,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le coach a DÉPLACÉ une séance confirmée (édition dans l'agenda) : sans ce
// point d'entrée, le client se présentait à l'ancien horaire. Appelé en
// best-effort après l'update ; met aussi l'événement Google à jour.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  const oldStartsAt = body.old_starts_at as string | undefined;
  if (!bookingId || !oldStartsAt) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Séance du coach connecté (RLS), déjà mise à jour côté client.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, coach_id, client_id, starts_at, ends_at, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ ok: true });
  const admin = createAdmin(SUPABASE_URL, serviceKey);

  // Événement Google recréé au nouvel horaire (best-effort).
  try {
    const { data: client } = await admin
      .from("clients")
      .select("email, first_name, last_name")
      .eq("id", booking.client_id)
      .maybeSingle();
    await detachMeetFromBooking(admin, bookingId);
    await attachMeetToBooking(admin, {
      bookingId,
      coachId: user.id,
      starts: new Date(booking.starts_at as string),
      ends: new Date(booking.ends_at as string),
      clientEmail: client?.email ?? null,
    });

    // Email au client : ancien et nouvel horaire, dans le fuseau du coach.
    if (client?.email) {
      const { data: coach } = await admin
        .from("coaches")
        .select("first_name, last_name, timezone")
        .eq("id", user.id)
        .maybeSingle();
      const fmt = (iso: string) =>
        new Date(iso).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: (coach?.timezone as string | null) || "Europe/Paris",
        });
      const tpl = bookingRescheduledClient({
        coachName:
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
          "Ton coach",
        oldDateStr: fmt(oldStartsAt),
        dateStr: fmt(booking.starts_at as string),
        reservationUrl: `${APP_URL}/reservation/${bookingId}`,
      });
      await sendEmail({
        to: client.email,
        subject: tpl.subject,
        html: tpl.html,
        replyTo: "contact@madger.app",
      });
    }
  } catch {
    /* best-effort : le déplacement reste acquis */
  }

  return NextResponse.json({ ok: true });
}
