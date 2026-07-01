import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Envoi des codes promo personnels aux membres early access — à déclencher AU
// LANCEMENT (sortie de l'accès anticipé). Chaque membre reçoit SON code par
// email. Protégé par un secret ; réservé à un usage serveur (service role).
//
// Appel : POST /api/admin/send-promo-codes?secret=XXX
// (XXX = variable d'env PROMO_SEND_SECRET). Réexécutable : n'envoie qu'aux
// codes pas encore envoyés (sent_at is null).

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

function emailHtml(code: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#CBFF03;letter-spacing:0.08em;text-transform:uppercase;">Accès anticipé</p>
          <h1 style="margin:0 0 12px;font-size:24px;color:#fff;">Ton Pro offert 3 mois 🎉</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#9a9a9a;line-height:1.7;">
            Madger est ouvert. En tant que membre early access, tu bénéficies de <b style="color:#fff;">3 mois de Pro offerts</b>. Voici ton code personnel :
          </p>
          <div style="text-align:center;margin:0 0 20px;padding:16px;border:1px dashed rgba(203,255,3,0.4);border-radius:12px;background:rgba(203,255,3,0.05);">
            <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#CBFF03;">${code}</span>
          </div>
          <p style="margin:0 0 24px;font-size:13px;color:#777;line-height:1.7;">
            Ce code est <b>personnel</b> et à <b>usage unique</b>. Crée ton compte avec <b>cet email</b>, puis saisis-le à l'étape "offre".
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${APP_URL}/signup" style="display:inline-block;background:#CBFF03;color:#000;font-size:14px;font-weight:800;padding:14px 32px;border-radius:100px;text-decoration:none;">Créer mon compte coach →</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendEmail(to: string, code: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Madger <contact@madger.app>",
      to,
      subject: "Ton accès Pro Madger · 3 mois offerts 🎉",
      html: emailHtml(code),
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.PROMO_SEND_SECRET || secret !== process.env.PROMO_SEND_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "missing_service_key" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data: codes, error } = await supabase
    .from("promo_codes")
    .select("code, email")
    .not("email", "is", null)
    .is("sent_at", null)
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  let sent = 0;
  for (const c of codes ?? []) {
    const ok = await sendEmail(c.email as string, c.code as string);
    if (ok) {
      await supabase
        .from("promo_codes")
        .update({ sent_at: new Date().toISOString() })
        .eq("code", c.code);
      sent += 1;
    }
  }

  return NextResponse.json({ sent, total: (codes ?? []).length });
}
