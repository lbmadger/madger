import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantFounderBonus } from "@/lib/subscription/founderBonus";
import { grantLaunchOffer } from "@/lib/subscription/launchOffer";

export const dynamic = "force-dynamic";

// Rattache l'offre de lancement au coach connecté d'après la date de création
// de son compte (lib/subscription/launchOffer.ts), pose la source
// d'acquisition et le mois de Pro fondateur. Écrit par le service role : le
// coach n'a pas le droit d'écrire ces colonnes lui-même. Idempotent.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { source } = (await req.json().catch(() => ({}))) as { source?: string };
  // Repli : source mémorisée sur le compte à l'inscription (le navigateur de
  // l'onboarding n'est pas toujours celui de l'inscription).
  const meta = (user.user_metadata ?? {}) as { madger_src?: string };
  const src = ((source || meta.madger_src) ?? "").trim().toLowerCase().slice(0, 40);

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 500 });

  // Source d'acquisition : posée une fois, jamais écrasée.
  if (src) {
    await admin
      .from("coaches")
      .update({ acquisition_source: src })
      .eq("id", user.id)
      .is("acquisition_source", null);
  }

  // Mois de Pro offert aux fondateurs : indépendant du lien de lancement.
  await grantFounderBonus(admin, user.id, user.email).catch(() => null);

  const granted = await grantLaunchOffer(admin, user.id, user.created_at).catch(() => false);
  return NextResponse.json({ ok: granted });
}
