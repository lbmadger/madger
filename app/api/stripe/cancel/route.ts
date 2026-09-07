import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { subPeriodEnd } from "@/lib/stripe/subscription";
import { sendEmail } from "@/lib/email/resend";
import { founderAlert } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const REASONS = new Set([
  "too_expensive",
  "not_enough_revenue",
  "missing_features",
  "other_tool",
  "pause",
  "other",
]);

// Résiliation de l'abonnement Pro en trois clics, depuis l'app : l'abonnement
// s'arrête à la FIN de la période déjà payée (le coach garde Pro jusque-là)
// et reste réactivable d'un clic d'ici là. La raison du départ est
// enregistrée et remontée au fondateur.
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
  const reason = REASONS.has(String(body.reason)) ? String(body.reason) : "other";
  const details = body.details ? String(body.details).slice(0, 1000) : null;

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, stripe_subscription_id, subscription_plan, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach?.stripe_subscription_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  try {
    const sub = await stripe.subscriptions.update(coach.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const endsAt = sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : subPeriodEnd(sub);
    await admin
      .from("coaches")
      .update({ subscription_status: "canceling", subscription_cancel_at: endsAt })
      .eq("id", coach.id);
    await admin.from("churn_feedback").insert({
      coach_id: coach.id,
      reason,
      details,
      plan: coach.subscription_plan ?? null,
      outcome: "cancelled",
    });

    // Le fondateur sait qui part et pourquoi, le jour même.
    if (process.env.FOUNDER_EMAIL) {
      try {
        const tpl = founderAlert({
          context: `Résiliation Pro : ${[coach.first_name, coach.last_name].filter(Boolean).join(" ") || coach.id}`,
          details: [
            `Raison : ${reason}`,
            details ? `Détail : ${details}` : "Pas de détail",
            `Plan : ${coach.subscription_plan ?? "?"}`,
            `Fin de période : ${endsAt ?? "?"}`,
          ],
        });
        await sendEmail({ to: process.env.FOUNDER_EMAIL, subject: tpl.subject, html: tpl.html });
      } catch {
        /* best-effort */
      }
    }
    return NextResponse.json({ ok: true, ends_at: endsAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
