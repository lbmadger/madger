import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { packRefundRequestedCoach } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le CLIENT demande le remboursement des séances non consommées de son pack.
// Le coach a 7 jours pour accepter (remboursement immédiat) ou refuser avec
// un motif ; sans réponse, le cron rembourse automatiquement.
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
  const note = body.note ? String(body.note).slice(0, 500) : null;
  if (!packId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: pack } = await admin
    .from("pack_credits")
    .select(
      "id, coach_id, client_id, payment_id, total, used, status, service_name, refund_request_status, clients(email, first_name, last_name)"
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
  if (pack.status !== "active") {
    return NextResponse.json({ error: "pack_inactive" }, { status: 409 });
  }
  const remaining = Math.max(0, (pack.total as number) - (pack.used as number));
  if (remaining === 0) {
    return NextResponse.json({ error: "nothing_to_refund" }, { status: 409 });
  }
  if (!pack.payment_id) {
    return NextResponse.json({ error: "no_payment" }, { status: 409 });
  }
  if (pack.refund_request_status === "pending") {
    return NextResponse.json({ error: "already_requested" }, { status: 409 });
  }

  // Une seule demande à la fois ; un refus antérieur n'empêche pas une
  // nouvelle demande (la situation peut avoir changé).
  const { data: claimed } = await admin
    .from("pack_credits")
    .update({
      refund_requested_at: new Date().toISOString(),
      refund_request_note: note,
      refund_request_status: "pending",
      refund_refused_reason: null,
      refund_responded_at: null,
    })
    .eq("id", pack.id)
    .eq("status", "active")
    .or("refund_request_status.is.null,refund_request_status.neq.pending")
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_requested" }, { status: 409 });
  }
  await admin.rpc("pack_credit_log", {
    p_pack: pack.id,
    p_booking: null,
    p_delta: 0,
    p_reason: "refund_requested",
    p_actor: "client",
    p_note: note,
  });

  // Le coach est prévenu (best-effort) : il a 7 jours.
  try {
    const [{ data: coachAuth }, { data: coach }] = await Promise.all([
      admin.auth.admin.getUserById(pack.coach_id as string),
      admin.from("coaches").select("locale").eq("id", pack.coach_id).maybeSingle(),
    ]);
    if (coachAuth?.user?.email) {
      const tpl = packRefundRequestedCoach({
        locale: coach?.locale === "en" ? "en" : "fr",
        clientName:
          [client.first_name, client.last_name].filter(Boolean).join(" ") || "Un client",
        packName: (pack.service_name as string | null) ?? "Pack",
        remaining,
        note,
        clientUrl: `${APP_URL}/dashboard/clients/${pack.client_id}`,
      });
      await sendEmail({ to: coachAuth.user.email, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, remaining });
}
