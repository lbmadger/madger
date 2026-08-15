import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { founderAlert } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// Signalement d'un client par un coach (comportement abusif, no-show en
// série, harcèlement…) : l'équipe Madger reçoit le contexte et décide de
// la suite. RLS : le coach ne peut signaler que SES clients.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientId = typeof body?.client_id === "string" ? body.client_id : "";
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!clientId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone")
    .eq("id", clientId)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (process.env.FOUNDER_EMAIL) {
    try {
      const tpl = founderAlert({
        context: "Client signalé par un coach",
        details: [
          `Client : ${[client.first_name, client.last_name].filter(Boolean).join(" ")} (${clientId})`,
          `Email client : ${(client.email as string | null) ?? "(aucun)"}`,
          `Téléphone : ${(client.phone as string | null) ?? "(aucun)"}`,
          `Coach : ${user.email ?? user.id}`,
          `Motif : ${reason || "(non précisé)"}`,
        ],
      });
      await sendEmail({
        to: process.env.FOUNDER_EMAIL,
        subject: tpl.subject,
        html: tpl.html,
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}
