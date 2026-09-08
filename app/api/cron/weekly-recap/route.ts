import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { cronAuthorized } from "@/lib/cron/auth";
import { runWeeklyRecap } from "@/lib/cron/weeklyRecap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Récap hebdo : la logique vit dans lib/cron/weeklyRecap.ts et part
// automatiquement chaque lundi depuis le cron quotidien /api/cron/reminders.
// Cette route reste pour un déclenchement manuel (Authorization: Bearer
// CRON_SECRET) ou un cron externe si besoin.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, serviceKey);
  return NextResponse.json(await runWeeklyRecap(supabase));
}
