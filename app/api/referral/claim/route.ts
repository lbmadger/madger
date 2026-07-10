import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Rattache un filleul à son parrain, à partir du code mémorisé au moment de
// l'inscription (localStorage → corps de la requête). Idempotent : ne fait
// rien si le coach a déjà un parrain, si le code est inconnu, ou si le coach
// tente de se parrainer lui-même.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const clean = (code ?? "").trim().toUpperCase();
  if (!clean) return NextResponse.json({ ok: false });

  // Déjà parrainé ? on ne retouche jamais.
  const { data: me } = await supabase
    .from("coaches")
    .select("referred_by")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.referred_by) return NextResponse.json({ ok: false });

  // Résout le parrain par son code.
  const { data: referrer } = await supabase
    .from("coaches")
    .select("id")
    .eq("referral_code", clean)
    .maybeSingle();
  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ ok: false });
  }

  const { error } = await supabase
    .from("coaches")
    .update({ referred_by: referrer.id })
    .eq("id", user.id)
    .is("referred_by", null);
  if (error) return NextResponse.json({ ok: false });

  return NextResponse.json({ ok: true });
}
