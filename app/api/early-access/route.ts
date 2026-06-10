import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Madger <contact@madger.app>",
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prenom, nom, email, telephone, type_coaching, nb_clients, instagram_site, defi } = body;

    // Validation basique
    if (!prenom || !email || !telephone || !type_coaching || !nb_clients || !defi) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // Sauvegarde en base Supabase (ne bloque pas si ça échoue)
    await supabase.from("early_access").insert({
      prenom, nom: nom || null, email, telephone,
      type_coaching, nb_clients, instagram_site: instagram_site || null, defi,
    });

    // Email de notification à toi (fondateur)
    await sendEmail({
      to: process.env.FOUNDER_EMAIL!,
      subject: `🟢 Nouvelle inscription : ${prenom} ${nom}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #CBFF03; background: #0A0A0A; padding: 16px; border-radius: 8px;">
            Nouvelle inscription Early Access
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; color: #666; width: 40%;">Nom</td><td style="padding: 8px; font-weight: 600;">${prenom} ${nom}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px; color: #666;">Téléphone</td><td style="padding: 8px;">${telephone}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Type de coaching</td><td style="padding: 8px;">${type_coaching}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Nb clients</td><td style="padding: 8px;">${nb_clients}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Instagram/Site</td><td style="padding: 8px;">${instagram_site || "-"}</td></tr>
            <tr><td style="padding: 8px; color: #666; vertical-align: top;">Défi principal</td><td style="padding: 8px;">${defi}</td></tr>
          </table>
        </div>
      `,
    });

    // 3. Email de confirmation au coach
    await sendEmail({
      to: email,
      subject: `${prenom}, tu es dans les premiers. Voilà ce qui t'attend.`,
      html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 32px;text-align:center;">
            <span style="font-size:28px;font-weight:900;color:#cbff03;letter-spacing:-1.5px;">Madger</span>
          </td>
        </tr>

        <!-- Hero card -->
        <tr>
          <td style="background:#141414;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px 40px 36px;mso-border-alt:none;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#cbff03;letter-spacing:0.08em;text-transform:uppercase;">Accès anticipé confirmé</p>
            <p style="margin:0 0 28px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">${prenom}, tu fais partie<br>des premiers.</p>

            <p style="margin:0 0 20px;font-size:15px;color:#9a9a9a;line-height:1.8;">
              On a créé Madger parce qu'on a vu des coachs incroyables perdre des heures chaque semaine sur WhatsApp, Excel et des relances qui ne devraient pas exister.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#9a9a9a;line-height:1.8;">
              Toi, tu as décidé que ça devait changer. C'est exactement pour des coachs comme toi qu'on construit Madger.
            </p>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 32px;"></div>

            <!-- What changes -->
            <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#ffffff;">Ce que Madger va changer pour toi :</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;vertical-align:top;padding-top:1px;">
                      <div style="width:22px;height:22px;background:rgba(203,255,3,0.12);border-radius:6px;text-align:center;line-height:22px;font-size:12px;">⏱</div>
                    </td>
                    <td>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Récupère 4 à 5h par semaine</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.6;">Fini les allers-retours pour caler un créneau ou relancer un paiement. Tout se règle au moment de la réservation.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;vertical-align:top;padding-top:1px;">
                      <div style="width:22px;height:22px;background:rgba(203,255,3,0.12);border-radius:6px;text-align:center;line-height:22px;font-size:12px;">💳</div>
                    </td>
                    <td>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Zéro impayé, jamais</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.6;">Stripe encaisse au moment de la réservation. Ton client paie, tu confirmes. Dans cet ordre, toujours.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;vertical-align:top;padding-top:1px;">
                      <div style="width:22px;height:22px;background:rgba(203,255,3,0.12);border-radius:6px;text-align:center;line-height:22px;font-size:12px;">🔗</div>
                    </td>
                    <td>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Un seul lien pour tout</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.6;">madger.app/tonnom dans ta bio Instagram. Tes clients réservent, paient et reçoivent leur facture. Sans toi dans la boucle.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;vertical-align:top;padding-top:1px;">
                      <div style="width:22px;height:22px;background:rgba(203,255,3,0.12);border-radius:6px;text-align:center;line-height:22px;font-size:12px;">🧾</div>
                    </td>
                    <td>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Factures automatiques, conformes</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.6;">Chaque séance génère sa facture et l'envoie à ton client. Plus jamais de fin de mois à tout refaire.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 32px;"></div>

            <!-- Exclusive badge -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(203,255,3,0.06);border:1px solid rgba(203,255,3,0.18);border-radius:12px;margin-bottom:32px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#cbff03;letter-spacing:0.06em;text-transform:uppercase;">Ton accès fondateur</p>
                <p style="margin:0;font-size:14px;color:#9a9a9a;line-height:1.7;">
                  Plan Pro offert <strong style="color:#ffffff;">3 mois</strong> dès le lancement, réservé aux membres fondateurs. Tu fais partie des premiers coachs sélectionnés. On te contacte directement dès que ton accès est prêt.
                </p>
              </td></tr>
            </table>

            <!-- Pendant ce temps -->
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;">En attendant, une chose à faire :</p>
            <p style="margin:0 0 28px;font-size:14px;color:#9a9a9a;line-height:1.8;">
              Note le temps que tu passes cette semaine sur l'administratif : relances, factures, calage de créneaux. Juste pour avoir un chiffre réel. Tu seras surpris. Et dans 3 mois, on compare.
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td align="center">
                <a href="https://madger.app" style="display:inline-block;background:#cbff03;color:#000000;font-size:14px;font-weight:800;padding:15px 36px;border-radius:100px;text-decoration:none;letter-spacing:-0.3px;">
                  Voir madger.app →
                </a>
              </td></tr>
            </table>

            <!-- Signature -->
            <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>
            <p style="margin:0 0 4px;font-size:14px;color:#ffffff;font-weight:600;">Léonard</p>
            <p style="margin:0 0 16px;font-size:13px;color:#555;">Fondateur de Madger</p>
            <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
              PS : Tu peux répondre directement à cet email si tu as une question, une idée ou juste envie d'en parler. Je lis tout.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#333;line-height:1.6;">
              Tu reçois cet email car tu t'es inscrit sur
              <a href="https://madger.app" style="color:#555;text-decoration:none;">madger.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
