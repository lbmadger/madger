import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { subPeriodEnd } from "@/lib/stripe/subscription";
import { sendEmail } from "@/lib/email/resend";
import {
  subscriptionStartedClient,
  subscriptionStartedCoach,
} from "@/lib/email/templates";

// Enregistre un abonnement mensuel client (session Checkout mode
// subscription) : fiche client, registre client_subscriptions, emails.
// Appelé par le webhook checkout.session.completed ET par la redirection de
// retour. Idempotent (unicité sur stripe_subscription_id).
export async function fulfillSubscriptionSession(
  sessionId: string
): Promise<{ slug: string }> {
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey || !sessionId) return { slug: "" };

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  const m = session.metadata ?? {};
  const slug = m.coach_slug || "";
  const sub =
    session.subscription && typeof session.subscription !== "string"
      ? (session.subscription as Stripe.Subscription)
      : null;

  if (m.kind !== "client_sub" || !m.coach_id || !sub) return { slug };

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: existing } = await supabase
    .from("client_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (existing) return { slug };

  // Fiche client (réutilise l'existante par email chez ce coach).
  let clientId: string | null = null;
  if (m.email) {
    const { data: c } = await supabase
      .from("clients")
      .select("id")
      .eq("coach_id", m.coach_id)
      .ilike("email", m.email)
      .maybeSingle();
    clientId = c?.id ?? null;
  }
  if (!clientId) {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        coach_id: m.coach_id,
        first_name: m.first_name || "Client",
        last_name: m.last_name || null,
        email: m.email || null,
        phone: m.phone || null,
      })
      .select("id")
      .single();
    clientId = created?.id ?? null;
  }

  const { error: insertError } = await supabase
    .from("client_subscriptions")
    .insert({
      coach_id: m.coach_id,
      client_id: clientId,
      service_id: m.service_id || null,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: subPeriodEnd(sub),
    });
  // Course perdue contre l'autre appel (index unique) : rien d'autre à faire.
  if (insertError) return { slug };

  // Emails (best-effort).
  try {
    const [{ data: coachRow }, { data: svc }, { data: coachAuth }] =
      await Promise.all([
        supabase
          .from("coaches")
          .select("first_name, last_name, locale")
          .eq("id", m.coach_id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("name, price_cents, currency")
          .eq("id", m.service_id)
          .maybeSingle(),
        supabase.auth.admin.getUserById(m.coach_id),
      ]);
    const coachName =
      [coachRow?.first_name, coachRow?.last_name].filter(Boolean).join(" ") ||
      "Ton coach";
    const serviceName = svc?.name || "Abonnement";
    const priceStr = ((svc?.price_cents ?? 0) / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: (svc?.currency || "eur").toUpperCase(),
    });
    if (m.email) {
      const tpl = subscriptionStartedClient({ coachName, serviceName, priceStr });
      await sendEmail({ to: m.email, subject: tpl.subject, html: tpl.html });
    }
    const coachEmail = coachAuth?.user?.email;
    if (coachEmail) {
      // Prix et repli dans la langue du coach (le client reste FR).
      const coachLocale = coachRow?.locale === "en" ? ("en" as const) : ("fr" as const);
      const coachPriceStr = ((svc?.price_cents ?? 0) / 100).toLocaleString(
        coachLocale === "en" ? "en-GB" : "fr-FR",
        {
          style: "currency",
          currency: (svc?.currency || "eur").toUpperCase(),
        }
      );
      const tpl = subscriptionStartedCoach({
        locale: coachLocale,
        clientName:
          [m.first_name, m.last_name].filter(Boolean).join(" ") ||
          (coachLocale === "en" ? "A client" : "Un client"),
        serviceName,
        priceStr: coachPriceStr,
      });
      await sendEmail({ to: coachEmail, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* emails best-effort */
  }

  return { slug };
}
