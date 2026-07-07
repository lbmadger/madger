import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Démarre (ou reprend) la connexion Stripe du coach : crée un compte Express
// s'il n'en a pas, puis renvoie un lien d'onboarding Stripe. Le coach y
// renseigne ses infos (IBAN, identité) pour pouvoir encaisser.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "not_a_coach" }, { status: 403 });
  }

  let accountId = coach.stripe_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      country: "FR",
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    accountId = account.id;
    // Colonne Stripe protégée par la RLS (0035) : écriture via service role.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }
    const admin = createAdmin(SUPABASE_URL, serviceKey);
    await admin
      .from("coaches")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard/paiements`,
    return_url: `${origin}/dashboard/paiements?connected=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
