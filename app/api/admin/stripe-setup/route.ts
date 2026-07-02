import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Configuration Stripe en un clic (admin) — évite les réglages manuels dans
// le dashboard Stripe :
//  1. crée le webhook /api/stripe/webhook (renouvellements d'abonnement Pro)
//     et renvoie son secret whsec_ à coller dans Vercel (affiché UNE fois) ;
//  2. crée la configuration du portail de facturation (gérer/annuler l'abo) ;
//  3. remonte l'état du compte (encaissement, transfers, Klarna).
// Idempotent : ne recrée rien qui existe déjà.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const result: {
    webhook: {
      status: "created" | "exists";
      url: string;
      secret?: string;
      envSet: boolean;
    };
    portal: { status: "created" | "exists" };
    account: {
      chargesEnabled: boolean;
      transfers: string;
      klarna: string;
      country: string | null;
    };
  } = {
    webhook: {
      status: "exists",
      url: `${APP_URL}/api/stripe/webhook`,
      envSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    portal: { status: "exists" },
    account: {
      chargesEnabled: false,
      transfers: "unknown",
      klarna: "unknown",
      country: null,
    },
  };

  try {
    // ── 1. Webhook (abonnement Pro) ──────────────────────────────────────
    const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = hooks.data.find((h) => h.url === result.webhook.url);
    if (!existing) {
      const created = await stripe.webhookEndpoints.create({
        url: result.webhook.url,
        enabled_events: [
          "invoice.paid",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ],
        description: "Madger · abonnement Pro (renouvellements/annulations)",
      });
      result.webhook.status = "created";
      // Le secret n'est lisible qu'à la création : à coller dans Vercel.
      result.webhook.secret = created.secret ?? undefined;
    }

    // ── 2. Portail de facturation ────────────────────────────────────────
    const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
    if (configs.data.length === 0) {
      await stripe.billingPortal.configurations.create({
        business_profile: {
          privacy_policy_url: `${APP_URL}/politique-de-confidentialite`,
          terms_of_service_url: `${APP_URL}/cgv`,
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: "at_period_end" },
        },
      });
      result.portal.status = "created";
    }

    // ── 3. État du compte plateforme ─────────────────────────────────────
    // GET /v1/account (compte plateforme) : les typings v22 de
    // accounts.retrieve exigent un id, on passe par la requête brute.
    const acct = (await stripe.rawRequest(
      "GET",
      "/v1/account"
    )) as unknown as Stripe.Account;
    result.account = {
      chargesEnabled: !!acct.charges_enabled,
      transfers: acct.capabilities?.transfers ?? "none",
      klarna: acct.capabilities?.klarna_payments ?? "none",
      country: acct.country ?? null,
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error", partial: result },
      { status: 500 }
    );
  }
}
