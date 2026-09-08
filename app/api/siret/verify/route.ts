import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { cleanSiret, isValidSiret, lookupSiret } from "@/lib/siret/siret";

export const dynamic = "force-dynamic";

// Vérifie et enregistre le SIRET du coach connecté.
//  - clé de Luhn fausse            → 400 invalid_siret (rien n'est enregistré)
//  - inconnu de l'annuaire officiel → 404 siret_not_found (rien n'est enregistré)
//  - établissement fermé           → 409 siret_closed (rien n'est enregistré)
//  - trouvé                        → enregistré + siret_verified_at + raison sociale
//  - annuaire indisponible         → enregistré SANS vérification (status unavailable),
//    pour ne jamais bloquer un coach à cause d'un service tiers.
// Le trigger de la migration 0070 remet la vérification à zéro si le coach
// change ensuite son SIRET directement dans ses réglages.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const siret = cleanSiret(String(body.siret ?? ""));
  if (!isValidSiret(siret)) {
    return NextResponse.json({ error: "invalid_siret" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: coach } = await admin
    .from("coaches")
    .select("id, business_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "not_a_coach" }, { status: 403 });
  }

  const found = await lookupSiret(siret);
  if (found.status === "not_found") {
    return NextResponse.json({ error: "siret_not_found" }, { status: 404 });
  }
  if (found.status === "found" && !found.active) {
    return NextResponse.json({ error: "siret_closed", legal_name: found.legalName }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> =
    found.status === "found"
      ? {
          siret,
          siret_verified_at: nowIso,
          siret_legal_name: found.legalName,
          // Raison sociale pré-remplie si le coach n'en a pas encore : elle
          // figure sur ses factures, il peut la corriger dans ses réglages.
          ...(!(coach.business_name as string | null)?.trim() ? { business_name: found.legalName } : {}),
        }
      : { siret, siret_verified_at: null, siret_legal_name: null };
  // Deux écritures : le trigger « siret modifié → vérification à zéro » se
  // déclenche sur la première, la seconde pose la vérification.
  const { error: e1 } = await admin.from("coaches").update({ siret }).eq("id", user.id);
  if (e1) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  const { siret: _s, ...rest } = patch;
  void _s;
  if (Object.keys(rest).length) {
    const { error: e2 } = await admin.from("coaches").update(rest).eq("id", user.id);
    if (e2) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: found.status,
    legal_name: found.status === "found" ? found.legalName : null,
    city: found.status === "found" ? found.city : null,
  });
}
