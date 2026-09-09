import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachMeetToBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Séance ajoutée à la main par le coach : si elle est en visio, sans lien, et
// que son agenda Google est connecté, on crée l'événement Google Meet et on
// pose le lien sur la réservation (le client le voit sur sa page et dans son
// espace). Best-effort : renvoie le lien ou null, jamais d'erreur bloquante.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  if (!bookingId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const { data: booking } = await admin
    .from("bookings")
    .select("id, coach_id, starts_at, ends_at, location, meeting_url, google_event_id, clients(first_name, last_name, email)")
    .eq("id", bookingId)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.location !== "online" || booking.meeting_url || booking.google_event_id) {
    return NextResponse.json({ meeting_url: (booking.meeting_url as string | null) ?? null });
  }

  const cl = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
  const meetUrl = await attachMeetToBooking(admin, {
    bookingId: booking.id as string,
    coachId: user.id,
    starts: new Date(booking.starts_at as string),
    ends: new Date((booking.ends_at as string) ?? (booking.starts_at as string)),
    clientName: [cl?.first_name, cl?.last_name].filter(Boolean).join(" ") || undefined,
    clientEmail: (cl?.email as string | null) ?? null,
  });
  return NextResponse.json({ meeting_url: meetUrl });
}
