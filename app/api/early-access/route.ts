import { createClient } from "@supabase/supabase-js";
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

    // Init Supabase à la demande (évite l'erreur de build si vars absentes)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Sauvegarde dans Supabase
    const { error: dbError } = await supabase.from("early_access").insert({
      prenom,
      nom,
      email,
      telephone,
      type_coaching,
      nb_clients,
      instagram_site: instagram_site || null,
      defi,
    });

    if (dbError) {
      console.error("Supabase error:", dbError);
      return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
    }

    // 2. Email de notification à toi (fondateur)
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
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Instagram/Site</td><td style="padding: 8px;">${instagram_site || "—"}</td></tr>
            <tr><td style="padding: 8px; color: #666; vertical-align: top;">Défi principal</td><td style="padding: 8px;">${defi}</td></tr>
          </table>
        </div>
      `,
    });

    // 3. Email de confirmation au coach
    await sendEmail({
      to: email,
      subject: "Bienvenue dans l'early access Madger 🚀",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0A0A0A; color: #fff; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 28px; font-weight: 900; color: #CBFF03; letter-spacing: -1px;">Madger</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">
            Bonjour ${prenom} 👋
          </h1>
          <p style="color: #A0A0A0; line-height: 1.7; margin-bottom: 16px;">
            Ta demande d'accès anticipé a bien été reçue. Tu es maintenant sur la liste des premiers coachs à tester Madger.
          </p>
          <div style="background: #141414; border: 1px solid rgba(203,255,3,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #CBFF03; font-weight: 700; margin: 0 0 8px 0;">Ce qui t'attend :</p>
            <ul style="color: #A0A0A0; line-height: 1.9; margin: 0; padding-left: 20px;">
              <li>Accès au plan Pro offert pendant 6 mois (valeur 294€)</li>
              <li>Réservations, paiements Stripe et facturation automatique</li>
              <li>Ton lien coach à partager en bio Instagram</li>
            </ul>
          </div>
          <p style="color: #A0A0A0; line-height: 1.7;">
            On te contactera sous 48h pour démarrer ton test. En attendant, si tu as des questions, réponds directement à cet email.
          </p>
          <p style="margin-top: 32px; color: #5A5A5A; font-size: 12px;">
            Madger · Tu reçois cet email car tu as rejoint la liste d'accès anticipé sur madger.app
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
