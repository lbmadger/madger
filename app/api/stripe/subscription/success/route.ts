import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { subPeriodEnd } from "@/lib/stripe/subscription";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Retour après souscription Pro. On confirme le paiement, on récupère la fin de
// période payée, puis on prolonge pro_until (service role, via RPC idempotente).
// Le renouvellement automatique est géré par le webhook.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripe || !serviceKey || !sessionId) {
    return NextResponse.redirect(`${origin}/dashboard/abonnement`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const coachId = session.metadata?.coach_id;
    const plan = session.metadata?.plan ?? null;

    // Essai de 7 jours : Stripe marque la session « no_payment_required »
    // (rien débité aujourd'hui) ; l'abonnement existe bel et bien.
    if (
      (session.payment_status === "paid" ||
        session.payment_status === "no_payment_required") &&
      coachId &&
      session.subscription
    ) {
      const sub: Stripe.Subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      const periodEnd = subPeriodEnd(sub);

      const supabase = createClient(SUPABASE_URL, serviceKey);
      if (sub.status === "trialing") {
        await supabase
          .from("coaches")
          .update({ pro_trial_used_at: new Date().toISOString() })
          .eq("id", coachId)
          .is("pro_trial_used_at", null);
      }
      await supabase.rpc("apply_pro_subscription", {
        p_coach_id: coachId,
        p_customer_id: customerId,
        p_subscription_id: sub.id,
        p_status: sub.status,
        p_plan: plan,
        p_period_end: periodEnd,
      });
    }
  } catch {
    /* on redirige quand même vers la page abonnement */
  }

  return NextResponse.redirect(`${origin}/dashboard/abonnement?pro=1`);
}
