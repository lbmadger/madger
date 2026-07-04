import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { requestReceivedClient } from "@/lib/email/templates";
import { googleCalendarUrl } from "@/lib/calendar/links";
import { attachMeetToBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le coach confirme une demande en attente → statut confirmé + email au
// client (« Séance confirmée ✅ »). RLS : seul le coach propriétaire modifie.
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
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id, starts_at, ends_at, client_id, location, meeting_url")
    .maybeSingle();
  if (error || !booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Visio : Google Meet + agenda du coach dès la confirmation (si son
  // compte Google est connecté). Alimenté dans le bloc email ci-dessous.
  let meetUrl = (booking.meeting_url as string | null) ?? undefined;

  // Email au client (best-effort).
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && booking.client_id) {
      const admin = createAdmin(SUPABASE_URL, serviceKey);
      const [{ data: client }, { data: coach }] = await Promise.all([
        admin
          .from("clients")
          .select("email")
          .eq("id", booking.client_id)
          .maybeSingle(),
        admin
          .from("coaches")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (booking.location === "online" && !meetUrl) {
        meetUrl =
          (await attachMeetToBooking(admin, {
            bookingId: booking.id as string,
            coachId: user.id,
            starts: new Date(booking.starts_at as string),
            ends: new Date(
              (booking.ends_at as string) ?? (booking.starts_at as string)
            ),
            clientEmail: client?.email ?? null,
          })) ?? undefined;
      }

      if (client?.email) {
        const tpl = requestReceivedClient({
          coachName:
            [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
            "Ton coach",
          dateStr: new Date(booking.starts_at as string).toLocaleString(
            "fr-FR",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            }
          ),
          instant: true, // variante « confirmée »
          reservationUrl: `${APP_URL}/reservation/${booking.id}`,
          meetUrl,
          calendarUrl: googleCalendarUrl({
            title: `Séance avec ${[coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "ton coach"}`,
            start: new Date(booking.starts_at as string),
            end: new Date(
              (booking.ends_at as string) ?? (booking.starts_at as string)
            ),
            details: `${APP_URL}/reservation/${booking.id}`,
            location: meetUrl,
          }),
        });
        await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
      }
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
