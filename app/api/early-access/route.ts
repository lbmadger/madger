import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

// Route dynamique : pas de mise en cache, le count doit être lu à chaque appel.
export const dynamic = "force-dynamic";

// Init paresseuse : ne crée le client qu'au premier appel pour ne pas planter
// le build si les variables d'env ne sont pas présentes au moment de la
// collecte des pages.
let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Nombre de places "fondateur" (plan Pro offert 3 mois). Au-delà, les
// inscriptions basculent automatiquement en liste d'attente. Réglable via
// la variable d'env FOUNDER_CAP sans redéploiement de code.
const FOUNDER_CAP = Number(process.env.FOUNDER_CAP ?? 50);

// Les champs saisis par l'utilisateur sont injectés dans le HTML des emails :
// sans échappement, n'importe qui pourrait faire envoyer du HTML arbitraire
// depuis contact@madger.app (phishing).
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Rate limiting en mémoire par IP. Sur Vercel chaque instance a sa propre
// Map : ce n'est pas étanche à 100 %, mais ça bloque l'abus évident
// (boucle de POST = spam Resend + pollution de la base) sans dépendance.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 h
const RATE_MAX = 5; // 5 inscriptions / h / IP
const rateMap = new Map<string, { count: number; start: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 .\-()]{6,20}$/;

// Longueurs max par champ : évite de stocker / envoyer des payloads énormes.
const MAX_LEN: Record<string, number> = {
  prenom: 60,
  nom: 80,
  email: 254,
  telephone: 25,
  type_coaching: 100,
  nb_clients: 40,
  instagram_site: 200,
  defi: 2000,
};

// Compte réel des inscrits en base. En cas d'erreur Supabase, on renvoie 0
// pour ne jamais bloquer une inscription.
async function getSignupCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("early_access")
    .select("*", { count: "exact", head: true });
  if (error || count == null) return 0;
  return count;
}

// Lu par le formulaire au chargement. On n'expose QUE l'état complet/pas
// complet (booléen) : ni le compte, ni les places restantes, pour que
// personne ne puisse suivre la progression des inscriptions.
export async function GET() {
  const count = await getSignupCount();
  return NextResponse.json(
    { full: count >= FOUNDER_CAP },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// L'envoi passe par sendEmail (lib/email/resend) : trace serveur en cas
// d'échec et garde si RESEND_API_KEY est absente, au lieu d'un fetch muet.

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
    }

    const body = await req.json();

    // Honeypot : champ invisible pour les humains. S'il est rempli, c'est un
    // bot — on répond "succès" sans rien enregistrer ni envoyer.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, waitlist: false });
    }

    const { prenom, nom, email, telephone, type_coaching, nb_clients, instagram_site, defi } = body;

    // Validation serveur (le client valide aussi, mais l'API doit se suffire)
    if (!prenom || !email || !telephone || !type_coaching || !nb_clients || !defi) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }
    for (const [field, max] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (value != null && (typeof value !== "string" || value.length > max)) {
        return NextResponse.json({ error: `Champ "${field}" invalide` }, { status: 400 });
      }
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }
    if (!PHONE_RE.test(telephone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Au-delà du cap fondateur, l'inscription bascule en liste d'attente.
    // (basé sur l'ordre d'arrivée : pas besoin de colonne dédiée)
    const waitlist = (await getSignupCount()) >= FOUNDER_CAP;

    // Déduplication : si l'email est déjà inscrit, on répond "succès" sans
    // ré-insérer ni renvoyer d'emails (idempotent, et le compteur du cap
    // fondateur reste juste).
    const { data: existing } = await getSupabase()
      .from("early_access")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, waitlist });
    }

    // Sauvegarde en base Supabase. Si elle échoue, on s'arrête : envoyer
    // "tu fais partie des premiers" à quelqu'un qui n'est pas enregistré
    // serait pire qu'une erreur visible.
    const { error: insertError } = await getSupabase().from("early_access").insert({
      prenom, nom: nom || null, email: normalizedEmail, telephone,
      type_coaching, nb_clients, instagram_site: instagram_site || null, defi,
    });
    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    // Valeurs échappées pour toute interpolation dans du HTML d'email.
    const safe = {
      prenom: escapeHtml(prenom),
      nom: escapeHtml(nom || ""),
      email: escapeHtml(normalizedEmail),
      telephone: escapeHtml(telephone),
      type_coaching: escapeHtml(type_coaching),
      nb_clients: escapeHtml(nb_clients),
      instagram_site: escapeHtml(instagram_site || ""),
      defi: escapeHtml(defi),
    };

    // Email de notification à toi (fondateur)
    await sendEmail({
      to: process.env.FOUNDER_EMAIL!,
      subject: `🟢 Nouvelle inscription${waitlist ? " (liste d'attente)" : ""} : ${prenom} ${nom || ""}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #CBFF03; background: #0A0A0A; padding: 16px; border-radius: 8px;">
            Nouvelle inscription Early Access
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; color: #666; width: 40%;">Nom</td><td style="padding: 8px; font-weight: 600;">${safe.prenom} ${safe.nom}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
            <tr><td style="padding: 8px; color: #666;">Téléphone</td><td style="padding: 8px;">${safe.telephone}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Type de coaching</td><td style="padding: 8px;">${safe.type_coaching}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Nb clients</td><td style="padding: 8px;">${safe.nb_clients}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; color: #666;">Instagram/Site</td><td style="padding: 8px;">${safe.instagram_site || "-"}</td></tr>
            <tr><td style="padding: 8px; color: #666; vertical-align: top;">Défi principal</td><td style="padding: 8px;">${safe.defi}</td></tr>
          </table>
        </div>
      `,
    });

    // 3. Email de confirmation au coach (texte adapté fondateur / liste d'attente)
    const greetingLabel = waitlist ? "Liste d'attente confirmée" : "Accès anticipé confirmé";
    const heroTitle = waitlist
      ? `${safe.prenom}, tu es sur<br>la liste.`
      : `${safe.prenom}, tu fais partie<br>des premiers.`;
    const badgeLabel = waitlist ? "Ta place sur la prochaine vague" : "Ton accès fondateur";
    const badgeText = waitlist
      ? `Les places fondateurs (plan Pro offert 3 mois) sont déjà toutes prises. Mais tu es <strong style="color:#ffffff;">prioritaire</strong> sur la prochaine vague d'ouverture. On te contacte dès qu'une place se libère.`
      : `Plan Pro offert <strong style="color:#ffffff;">3 mois</strong> dès le lancement, réservé aux membres fondateurs. Tu fais partie des premiers coachs sélectionnés. On te contacte directement dès que ton accès est prêt.`;

    await sendEmail({
      to: normalizedEmail,
      subject: waitlist
        ? `${prenom}, tu es sur la liste d'attente Madger.`
        : `${prenom}, tu es dans les premiers. Voilà ce qui t'attend.`,
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
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#cbff03;letter-spacing:0.08em;text-transform:uppercase;">${greetingLabel}</p>
            <p style="margin:0 0 28px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">${heroTitle}</p>

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
                <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#cbff03;letter-spacing:0.06em;text-transform:uppercase;">${badgeLabel}</p>
                <p style="margin:0;font-size:14px;color:#9a9a9a;line-height:1.7;">
                  ${badgeText}
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

    return NextResponse.json({ success: true, waitlist });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
