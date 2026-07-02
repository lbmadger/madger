import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

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

  return NextResponse.json({ ok: true });
}
