import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Un client signale un problème sur une séance payée. Tant que les fonds ne sont
// pas libérés, ils sont GELÉS (escrow_status = 'disputed') jusqu'à la décision
// d'un admin (cf. charte). Vérification légère : l'e-mail doit correspondre à
// celui du client de la réservation (l'action ne déplace aucun argent, elle ne
// fait que bloquer — un admin tranche ensuite).
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = body.booking_id as string | undefined;
  const email = (body.email as string | undefined)?.trim().toLowerCase();
  const reason = (body.reason as string | undefined)?.slice(0, 1000) || null;
  if (!bookingId || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: payment } = await supabase
    .from("payments")
    .select("id, client_id, escrow_status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (payment.escrow_status !== "held") {
    // Déjà libéré, remboursé ou déjà en litige : plus rien à geler.
    return NextResponse.json({ error: "not_disputable" }, { status: 409 });
  }

  // Vérifie que l'e-mail correspond au client de la réservation.
  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", payment.client_id)
    .maybeSingle();
  if (!client?.email || client.email.trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  await supabase
    .from("payments")
    .update({
      escrow_status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: reason,
    })
    .eq("id", payment.id);

  return NextResponse.json({ ok: true });
}
