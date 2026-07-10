import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Validation / refus d'un diplôme de coach par l'équipe Madger. Réservé aux
// e-mails admin ; écrit via le service role (bypass RLS).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { coachId, action, note } = (await req.json().catch(() => ({}))) as {
    coachId?: string;
    action?: "approve" | "reject";
    note?: string;
  };
  if (!coachId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const { error } = await admin
    .from("coaches")
    .update({
      verification_status: action === "approve" ? "verified" : "rejected",
      verification_reviewed_at: new Date().toISOString(),
      verification_note: action === "reject" ? note?.trim() || null : null,
    })
    .eq("id", coachId);
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
