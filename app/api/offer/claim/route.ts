import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LAUNCH_LINK, launchLinkActive } from "@/lib/subscription/offer";
import { LAUNCH_AT } from "@/lib/launch";

// Même plafond que le formulaire d'accès anticipé : au-delà, l'inscrit
// était sur liste d'attente (son email le lui disait) et n'a rien été promis.
const FOUNDER_CAP = Number(process.env.FOUNDER_CAP ?? 50);
const FOUNDER_BONUS_MONTHS = 1;

// Promesse faite aux membres fondateurs (landing, CGV, email d'accès
// anticipé) : « Plan Pro offert 1 mois dès le lancement ». Posée une seule
// fois par coach, sur pro_bonus_until (accès offert, aucun débit), cumulée
// à un éventuel mois déjà offert. Réservée aux inscrits d'avant l'ouverture.
async function grantFounderBonus(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  coachId: string,
  email: string | null | undefined
) {
  const clean = (email ?? "").trim().toLowerCase();
  if (!clean) return;
  const { data: row } = await admin
    .from("early_access")
    .select("created_at")
    .eq("email", clean)
    .lt("created_at", LAUNCH_AT)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!row?.created_at) return;
  const { count: before } = await admin
    .from("early_access")
    .select("id", { count: "exact", head: true })
    .lt("created_at", row.created_at as string);
  if ((before ?? 0) >= FOUNDER_CAP) return;
  const { data: me } = await admin
    .from("coaches")
    .select("pro_bonus_until, founder_bonus_granted_at")
    .eq("id", coachId)
    .maybeSingle();
  if (!me || me.founder_bonus_granted_at) return;
  const base = Math.max(
    Date.now(),
    me.pro_bonus_until ? new Date(me.pro_bonus_until as string).getTime() : 0
  );
  const until = new Date(base);
  until.setUTCMonth(until.getUTCMonth() + FOUNDER_BONUS_MONTHS);
  await admin
    .from("coaches")
    .update({
      pro_bonus_until: until.toISOString(),
      founder_bonus_granted_at: new Date().toISOString(),
    })
    .eq("id", coachId)
    .is("founder_bonus_granted_at", null);
}

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

  const { code, source } = (await req.json().catch(() => ({}))) as {
    code?: string;
    source?: string;
  };
  // Repli : code et source mémorisés sur le compte à l'inscription (le
  // navigateur de l'onboarding n'est pas toujours celui de l'inscription).
  const meta = (user.user_metadata ?? {}) as { madger_offer?: string; madger_src?: string };
  const clean = ((code || meta.madger_offer) ?? "").trim().toUpperCase();
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

  if (clean !== LAUNCH_LINK.code || !launchLinkActive()) {
    return NextResponse.json({ ok: false });
  }

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
