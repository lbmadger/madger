import { NextRequest, NextResponse } from "next/server";

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
      from: "Madger <bonjour@madger.app>",
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
    if (!prenom || !nom || !email || !telephone || !type_coaching || !nb_clients || !defi) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

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
      subject: `Bienvenue dans l'early access Madger, ${prenom}`,
      html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
            <span style="font-size:26px;font-weight:900;color:#cbff03;letter-spacing:-1px;">Madger</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#111;">Bonjour ${prenom} 👋</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
              Ta demande d'early access a bien été reçue. Tu es maintenant sur la liste des premiers coachs à tester Madger.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
              On te contactera <strong>prochainement</strong> pour démarrer ton accès dès que Madger sera disponible. En attendant, voilà ce qui t'attend :
            </p>

            <!-- Features -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#222;border-bottom:1px solid #e5e7eb;">
                      <span style="display:inline-block;width:24px;">🎁</span>
                      <strong>Plan Pro offert 6 mois</strong> - valeur 294€
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#222;border-bottom:1px solid #e5e7eb;">
                      <span style="display:inline-block;width:24px;">📅</span>
                      Réservations et paiements Stripe automatiques
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#222;border-bottom:1px solid #e5e7eb;">
                      <span style="display:inline-block;width:24px;">🧾</span>
                      Facturation générée automatiquement
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#222;">
                      <span style="display:inline-block;width:24px;">🔗</span>
                      Ton lien coach pro à partager en bio Instagram
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="https://madger.app" style="display:inline-block;background:#cbff03;color:#000;font-size:14px;font-weight:700;padding:14px 32px;border-radius:100px;text-decoration:none;">
                  Visiter madger.app →
                </a>
              </td></tr>
            </table>

            <p style="margin:0;font-size:14px;color:#666;line-height:1.6;">
              Des questions ? Réponds directement à cet email, on est là.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Tu reçois cet email car tu as rejoint la liste d'accès anticipé sur
              <a href="https://madger.app" style="color:#9ca3af;">madger.app</a>
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
