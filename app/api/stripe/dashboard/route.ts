import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Lien de connexion vers le tableau de bord Stripe Express du coach : c'est
// là qu'il voit ses virements, son IBAN et ses justificatifs. Le lien est à
// usage unique et expire vite — on le crée donc au clic, jamais au rendu.
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

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
  const accountId = coach?.stripe_account_id as string | null | undefined;
  if (!accountId) {
    return NextResponse.json({ error: "no_account" }, { status: 400 });
  }

  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    // Même politique que /api/stripe/connect : on remonte le message Stripe
    // sur une route authentifiée, sinon l'échec est indiagnosticable.
    const message = err instanceof Error ? err.message : "Erreur Stripe inconnue";
    console.error("stripe_dashboard_link_failed:", message);
    return NextResponse.json(
      { error: "stripe_error", detail: message },
      { status: 502 }
    );
  }
}
