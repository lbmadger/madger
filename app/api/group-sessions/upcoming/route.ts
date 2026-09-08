import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Cours collectifs à venir d'un coach (vue publique, places prises), pour
// placer une place de pack collectif depuis l'espace client.
// GET /api/group-sessions/upcoming?coach=<id>&service=<id>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const coachId = searchParams.get("coach");
  const serviceId = searchParams.get("service");
  if (!coachId) {
    return NextResponse.json({ error: "missing_coach" }, { status: 400 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let q = supabase
    .from("public_group_sessions")
    .select("*")
    .eq("coach_id", coachId)
    .lte("starts_at", new Date(Date.now() + 60 * 86400000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);
  if (serviceId) q = q.eq("service_id", serviceId);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}
