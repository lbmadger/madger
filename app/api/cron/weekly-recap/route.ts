import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { weeklyRecapCoach } from "@/lib/email/templates";
import { cronAuthorized } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Récap hebdo du lundi matin : LE seul email récurrent du coach. Résume la
// semaine écoulée (lundi → dimanche) et renvoie vers les stats. Un coach à
// semaine entièrement vide ne reçoit rien : un récap à zéro partout ne
// motive personne, il rappelle juste que rien ne se passe.
//
// À planifier sur cron-job.org (les 2 crons Vercel Hobby sont pris) :
// GET /api/cron/weekly-recap, le lundi à 6h UTC, header
// Authorization: Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // Semaine écoulée : du lundi 00:00 précédent au lundi 00:00 courant,
  // en Europe/Paris approchée par UTC (la précision à l'heure près suffit
  // pour un récap, et le cron tourne le lundi matin).
  const nowD = new Date();
  const weekEnd = new Date(nowD);
  weekEnd.setUTCHours(0, 0, 0, 0);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - ((weekEnd.getUTCDay() + 6) % 7));
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
  const fromIso = weekStart.toISOString();
  const toIso = weekEnd.toISOString();

  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  let sent = 0;
  let scanned = 0;

  const { data: coaches } = await supabase
    .from("coaches")
    .select("id, first_name, locale")
    .eq("onboarding_completed", true)
    .limit(500);

  const euros = (cents: number) =>
    (cents / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  for (const c of coaches ?? []) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    scanned++;
    const cid = c.id as string;
    const head = { count: "exact" as const, head: true };

    const [sessionsRes, paymentsRes, clientsRes, reviewsRes] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("id", head)
          .eq("coach_id", cid)
          .eq("is_block", false)
          .neq("status", "cancelled")
          .gte("ends_at", fromIso)
          .lt("ends_at", toIso),
        supabase
          .from("payments")
          .select("amount_cents")
          .eq("coach_id", cid)
          .gte("paid_at", fromIso)
          .lt("paid_at", toIso),
        supabase
          .from("clients")
          .select("id", head)
          .eq("coach_id", cid)
          .gte("created_at", fromIso)
          .lt("created_at", toIso),
        supabase
          .from("reviews")
          .select("id", head)
          .eq("coach_id", cid)
          .gte("created_at", fromIso)
          .lt("created_at", toIso),
      ]);

    const sessionsDone = sessionsRes.count ?? 0;
    const collectedCents = (paymentsRes.data ?? []).reduce(
      (sum, p) => sum + ((p.amount_cents as number) || 0),
      0
    );
    const newClients = clientsRes.count ?? 0;
    const newReviews = reviewsRes.count ?? 0;

    // Semaine morte : silence. On ne facture pas l'attention d'un coach
    // pour lui dire qu'il ne s'est rien passé.
    if (
      sessionsDone === 0 &&
      collectedCents === 0 &&
      newClients === 0 &&
      newReviews === 0
    ) {
      continue;
    }

    const { data: u } = await supabase.auth.admin.getUserById(cid);
    const email = u?.user?.email;
    if (!email) continue;

    const tpl = weeklyRecapCoach({
      firstName: (c.first_name as string | null) || null,
      sessionsDone,
      collectedStr: collectedCents > 0 ? euros(collectedCents) : null,
      newClients,
      newReviews,
      statsUrl: `${APP_URL}/dashboard/stats`,
    });
    if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
      sent++;
    }
  }

  return NextResponse.json({ sent, scanned, from: fromIso, to: toIso });
}
