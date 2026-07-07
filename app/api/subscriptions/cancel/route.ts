import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import {
  subscriptionCancelledClient,
  subscriptionCancelledCoach,
} from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export const dynamic = "force-dynamic";

// Arrêt d'un abonnement mensuel par le CLIENT (espace « Mes séances »).
// L'abonnement reste actif jusqu'à la fin de la période déjà payée
// (cancel_at_period_end), puis s'arrête sans nouveau prélèvement.
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
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subId = body.subscription_id as string | undefined;
  if (!subId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: sub } = await admin
    .from("client_subscriptions")
    .select(
      "id, client_id, coach_id, stripe_subscription_id, status, current_period_end"
    )
    .eq("id", subId)
    .maybeSingle();
  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // L'abonnement appartient-il bien au compte connecté (email) ?
  const { data: clientRow } = await admin
    .from("clients")
    .select("email, first_name, last_name")
    .eq("id", sub.client_id)
    .maybeSingle();
  if (
    !clientRow?.email ||
    clientRow.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
      cancel_at_period_end: true,
    });
    await admin
      .from("client_subscriptions")
      .update({ status: "canceling" })
      .eq("id", sub.id);

    // Confirmations (best-effort) : le client sait jusqu'à quand il est
    // couvert, le coach apprend qu'un abonné s'arrête.
    try {
      const endDateStr = sub.current_period_end
        ? new Date(sub.current_period_end as string).toLocaleDateString(
            "fr-FR",
            { day: "numeric", month: "long", year: "numeric" }
          )
        : null;
      const { data: coachRow } = await admin
        .from("coaches")
        .select("first_name, last_name, locale")
        .eq("id", sub.coach_id)
        .maybeSingle();
      const clientTpl = subscriptionCancelledClient({
        coachName:
          [coachRow?.first_name, coachRow?.last_name]
            .filter(Boolean)
            .join(" ") || "ton coach",
        endDateStr,
      });
      await sendEmail({
        to: user.email,
        subject: clientTpl.subject,
        html: clientTpl.html,
      });
      const { data: coachAuth } = await admin.auth.admin.getUserById(
        sub.coach_id as string
      );
      if (coachAuth?.user?.email) {
        const coachTpl = subscriptionCancelledCoach({
          locale: coachRow?.locale === "en" ? "en" : "fr",
          clientName:
            [clientRow?.first_name, clientRow?.last_name]
              .filter(Boolean)
              .join(" ") || "Un client",
          endDateStr,
          dashboardUrl: `${APP_URL}/dashboard/messages`,
        });
        await sendEmail({
          to: coachAuth.user.email,
          subject: coachTpl.subject,
          html: coachTpl.html,
        });
      }
    } catch {
      /* best-effort */
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
}
