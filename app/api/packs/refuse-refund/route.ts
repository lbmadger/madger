import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { packRefundRefusedClient } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le COACH refuse la demande de remboursement d'un pack, avec un motif
// obligatoire. Le client reçoit le motif et peut saisir Madger (réponse à
// l'email, adressée au support), qui tranche comme pour un litige.
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const packId = body.pack_id as string | undefined;
  const reason = body.reason ? String(body.reason).trim().slice(0, 500) : "";
  if (!packId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (reason.length < 10) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: claimed } = await admin
    .from("pack_credits")
    .update({
      refund_request_status: "refused",
      refund_refused_reason: reason,
      refund_responded_at: new Date().toISOString(),
    })
    .eq("id", packId)
    .eq("coach_id", user.id)
    .eq("refund_request_status", "pending")
    .select("id, client_id, total, used, service_name")
    .maybeSingle();
  if (!claimed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await admin.rpc("pack_credit_log", {
    p_pack: claimed.id,
    p_booking: null,
    p_delta: 0,
    p_reason: "refund_refused",
    p_actor: "coach",
    p_note: reason,
  });

  try {
    const [{ data: client }, { data: coach }] = await Promise.all([
      admin.from("clients").select("email").eq("id", claimed.client_id).maybeSingle(),
      admin.from("coaches").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    ]);
    if (client?.email) {
      const tpl = packRefundRefusedClient({
        coachName:
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach",
        packName: (claimed.service_name as string | null) ?? "Pack",
        remaining: Math.max(0, (claimed.total as number) - (claimed.used as number)),
        reason,
        spaceUrl: `${APP_URL}/espace`,
      });
      await sendEmail({
        to: client.email,
        subject: tpl.subject,
        html: tpl.html,
        replyTo: "contact@madger.app",
      });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
