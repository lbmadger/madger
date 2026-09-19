import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { clientCancelDeniedCoach } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le client refuse l'annulation déclarée par son coach : la séance est
// maintenue, la demande effacée, le coach prévenu. Le compte connecté doit
// correspondre (email) au client de la réservation.
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
  if (!bookingId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey, NO_STORE);
  const { data: booking } = await admin
    .from("bookings")
    .select("id, coach_id, client_id, starts_at, status, client_cancel_requested_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.status === "cancelled" || !booking.client_cancel_requested_at) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: clientRow } = await admin
    .from("clients")
    .select("email, first_name, last_name")
    .eq("id", booking.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await admin
    .from("bookings")
    .update({ client_cancel_requested_at: null })
    .eq("id", bookingId);

  try {
    const [{ data: coachAuth }, { data: coach }] = await Promise.all([
      admin.auth.admin.getUserById(booking.coach_id as string),
      admin.from("coaches").select("locale, timezone").eq("id", booking.coach_id).maybeSingle(),
    ]);
    const coachEmail = coachAuth?.user?.email;
    if (coachEmail) {
      const locale = coach?.locale === "en" ? ("en" as const) : ("fr" as const);
      const tpl = clientCancelDeniedCoach({
        locale,
        clientName:
          [clientRow.first_name, clientRow.last_name].filter(Boolean).join(" ") ||
          (locale === "en" ? "Your client" : "Ton client"),
        dateStr: new Date(booking.starts_at as string).toLocaleString(
          locale === "en" ? "en-GB" : "fr-FR",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: (coach?.timezone as string | null) || "Europe/Paris",
          }
        ),
        dashboardUrl: `${APP_URL}/dashboard/agenda`,
      });
      await sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
