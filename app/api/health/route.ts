import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { NO_STORE } from "@/lib/supabase/noStore";

export const dynamic = "force-dynamic";

// Santé du site pour un moniteur externe (cron-job.org, UptimeRobot) : 200
// si l'application répond ET que la base est joignable (la vue publique
// des coachs, lecture anonyme), 503 sinon. Aucune donnée renvoyée.
export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_STORE);
    const { error } = await supabase
      .from("public_coaches")
      .select("slug", { count: "exact", head: true })
      .limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
