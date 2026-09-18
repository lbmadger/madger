import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LAUNCH_LINK, launchLinkActive } from "@/lib/subscription/offer";

export const dynamic = "force-dynamic";

// Rattache l'offre de lancement au coach connecté, à partir du code mémorisé
// au moment de l'inscription (localStorage → corps de la requête). Écrit par
// le service role : le coach n'a pas le droit d'écrire cette colonne lui-même.
// Idempotent : rien si le code est inconnu, le lien expiré, ou l'offre déjà
// posée. Réservé à un coach sans abonnement passé.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const clean = (code ?? "").trim().toUpperCase();
  if (clean !== LAUNCH_LINK.code || !launchLinkActive()) {
    return NextResponse.json({ ok: false });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: me } = await admin
    .from("coaches")
    .select("launch_offer, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.launch_offer || me.stripe_subscription_id) {
    return NextResponse.json({ ok: false });
  }

  const { error } = await admin
    .from("coaches")
    .update({ launch_offer: LAUNCH_LINK.code, launch_offer_claimed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("launch_offer", null);
  if (error) return NextResponse.json({ ok: false });

  return NextResponse.json({ ok: true });
}
