import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { performClientCancellation } from "@/lib/booking/clientCancel";

export const dynamic = "force-dynamic";
// Refund + transfert Stripe + agenda Google + emails en série : la limite
// de 10 s par défaut peut couper la fonction après que l'argent a bougé.
export const maxDuration = 30;

// Annulation par le CLIENT (espace « Mes séances »). Le compte connecté doit
// correspondre (email) au client de la réservation. Le travail vit dans
// lib/booking/clientCancel, partagé avec la résolution automatique du cron.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey) {
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
  const result = await performClientCancellation(admin, stripe, {
    bookingId,
    clientEmail: user.email,
  });
  return NextResponse.json(result.body, { status: result.status });
}
