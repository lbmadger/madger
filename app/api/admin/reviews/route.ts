import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Modération admin : masque ou réaffiche un avis. Le trigger de la
// migration 0053 recalcule la note moyenne du coach dans la foulée.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const reviewId = typeof body?.review_id === "string" ? body.review_id : "";
  const hidden = body?.hidden === true;
  if (!reviewId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { error } = await admin
    .from("reviews")
    .update({ hidden })
    .eq("id", reviewId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
