import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { refundPackRemainder } from "@/lib/packs/refund";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Le COACH rembourse le reste d'un pack (décision commerciale, ou réponse à
// la demande du client). Le calcul, la clôture, l'avoir et l'email sont
// partagés avec le cron (lib/packs/refund).
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
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const packId = body.pack_id as string | undefined;
  if (!packId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: pack } = await admin
    .from("pack_credits")
    .select("id, coach_id, total, used, refund_request_status")
    .eq("id", packId)
    .maybeSingle();
  if (!pack || pack.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const remaining = Math.max(0, (pack.total as number) - (pack.used as number));

  const outcome = await refundPackRemainder(admin, stripe, {
    packId,
    actor: "coach",
    note:
      pack.refund_request_status === "pending"
        ? `${remaining} séance(s) remboursée(s) à la demande du client`
        : `${remaining} séance(s) remboursée(s) par le coach`,
    mode: "coach",
  });
  if (!outcome.ok) {
    const status =
      outcome.error === "not_found" ? 404 : outcome.error === "stripe_error" ? 500 : 409;
    return NextResponse.json({ error: outcome.error, detail: outcome.detail }, { status });
  }
  return NextResponse.json({
    ok: true,
    refunded_cents: outcome.refund_cents,
    remaining: outcome.remaining,
  });
}
