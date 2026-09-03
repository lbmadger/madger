import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { newReviewCoach } from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export const dynamic = "force-dynamic";

// Dépôt d'un avis après une séance. Vérifications :
//  - la séance existe, n'est pas annulée, et est TERMINÉE ;
//  - l'email fourni correspond au client de la réservation.
// Puis upsert sur (coach_id, client_id) : 1 client = 1 avis par coach — un
// nouvel avis remplace l'ancien (note et commentaire mis à jour).
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  const email = (body.email as string | undefined)?.trim().toLowerCase();
  const rating = Math.round(Number(body.rating));
  const comment = (body.comment as string | undefined)?.trim().slice(0, 1000) || null;

  if (!bookingId || !email || !(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, coach_id, client_id, ends_at, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || !booking.client_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "not_eligible" }, { status: 409 });
  }
  if (new Date(booking.ends_at).getTime() > Date.now()) {
    return NextResponse.json({ error: "too_early" }, { status: 409 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, email")
    .eq("id", booking.client_id)
    .maybeSingle();
  if (!client?.email || client.email.trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Nouvel avis ou mise à jour ? (le coach n'est prévenu que d'un NOUVEL
  // avis : une note retouchée ne mérite pas un email de plus)
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("coach_id", booking.coach_id)
    .eq("client_id", client.id)
    .maybeSingle();

  // 1 client = 1 avis : upsert sur la contrainte (coach_id, client_id).
  const { error } = await supabase.from("reviews").upsert(
    {
      coach_id: booking.coach_id,
      client_id: client.id,
      booking_id: booking.id,
      rating,
      comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,client_id" }
  );
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Prévient le coach (best-effort : l'avis est enregistré quoi qu'il
  // arrive). C'est aussi le moment idéal pour suggérer le partage en story.
  if (!existing) {
    try {
      // L'email du coach vit dans auth (la table coaches n'en a pas).
      const [{ data: coachUser }, { data: cl }] = await Promise.all([
        supabase.auth.admin.getUserById(booking.coach_id),
        supabase
          .from("clients")
          .select("first_name")
          .eq("id", client.id)
          .maybeSingle(),
      ]);
      const coachEmail = coachUser?.user?.email;
      if (coachEmail) {
        const tpl = newReviewCoach({
          clientFirstName: (cl?.first_name as string) || "Un client",
          rating,
          comment,
          reviewsUrl: `${APP_URL}/dashboard/avis`,
        });
        await sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html });
      }
    } catch {
      /* jamais bloquant */
    }
  }

  return NextResponse.json({ ok: true });
}
