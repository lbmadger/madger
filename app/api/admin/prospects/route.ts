import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/email/resend";
import { siteLaunched } from "@/lib/launch";
import { LAUNCH_LINK, launchLinkActive, launchLinkDeadlineLabel, launchLinkMonthlyCents, currentMonthlyCents } from "@/lib/subscription/offer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Campagne de prospection vers les coachs de la table prospects (adresses
// professionnelles affichées sur leur site). Un seul envoi par adresse
// (sent_at), jamais vers un désinscrit. Signée Léonard, réponses vers sa
// boîte. Mode test : un exemplaire vers l'admin connecté, rien marqué.
const FROM = "Léonard de Madger <l.bondeau@madger.app>";
const REPLY_TO = "l.bondeau@madger.app";
const BATCH = 60;

function escapeHtml(v: string): string {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function template(prenomBrut: string) {
  const prenom = escapeHtml(prenomBrut.trim().split(/\s+/)[0] || "coach");
  const slug = prenom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  const ouverture = siteLaunched()
    ? "C'est ouvert depuis dimanche."
    : "Ça ouvre dimanche à 18h.";
  const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: c % 100 ? 2 : 0 }) + " €";
  const suite = launchLinkActive()
    ? `Ensuite, si ton compte est créé avant le ${launchLinkDeadlineLabel("fr")}, l'offre de lancement s'ajoute : ${eur(launchLinkMonthlyCents())} par mois pendant ${LAUNCH_LINK.months} mois au lieu de ${eur(currentMonthlyCents())}, puis ${eur(currentMonthlyCents())} par mois. Sans engagement, tu arrêtes quand tu veux en un clic.`
    : `Ensuite c'est ${eur(currentMonthlyCents())} par mois, sans engagement, et tu arrêtes quand tu veux en un clic.`;
  const p = (t: string) => `<p style="margin:0 0 16px;">${t}</p>`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px;">
${p(`Bonjour ${prenom},`)}
${p("Je suis tombé sur ton site en cherchant des coachs sportifs indépendants, et je me permets de t'écrire parce que j'ai créé un outil pour vous.")}
${p(`Ça s'appelle Madger. Tu as une page à ton nom, madger.app/${slug} : tes clients choisissent leur créneau, ils paient en réservant, et la facture part toute seule. Tu n'as plus rien à relancer. C'est gratuit pour commencer. ${ouverture}`)}
${p(`Comme je te contacte directement, je t'offre le premier mois de Pro, au lieu des 7 jours d'essai habituels : tu crées ton compte avec l'adresse de ce mail, tu enregistres ta carte, rien n'est débité pendant 30 jours. ${suite}`)}
${p(`Si tu veux voir à quoi ça ressemble, c'est ici : <a href="https://madger.app" style="color:#111;">madger.app</a>. Et pour suivre l'ouverture et les nouveautés, tu peux suivre la page Instagram : <a href="https://instagram.com/madger.app" style="color:#111;">@madger.app</a>`)}
${p("Bonne journée,<br>Léonard Bondeau<br>Fondateur de Madger")}
<p style="margin:24px 0 0;font-size:12px;color:#777;line-height:1.5;">Je t'écris une seule fois, à l'adresse professionnelle affichée sur ton site, et je ne te relancerai pas.</p>
</div>`;
  return { subject: `Une question sur tes réservations, ${prenom}`, html };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { test?: boolean } | null;

  if (body?.test) {
    const tpl = template("Léonard");
    const ok = await sendEmail({
      to: user.email as string,
      from: FROM,
      replyTo: REPLY_TO,
      subject: `[TEST] ${tpl.subject}`,
      html: tpl.html,
    });
    return NextResponse.json({ test: true, sent: ok ? 1 : 0 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 500 });
  const { data: rows, error } = await admin
    .from("prospects")
    .select("id, prenom, email")
    .is("sent_at", null)
    .is("unsubscribed_at", null)
    .order("created_at")
    .limit(BATCH);
  if (error) {
    return NextResponse.json({ error: `db: ${error.message.slice(0, 200)}` }, { status: 500 });
  }

  let sent = 0;
  for (const r of rows ?? []) {
    const tpl = template(r.prenom as string);
    const ok = await sendEmail({
      to: (r.email as string).trim(),
      from: FROM,
      replyTo: REPLY_TO,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (ok) {
      await admin.from("prospects").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
      sent++;
    }
  }
  return NextResponse.json({ sent, total: (rows ?? []).length });
}
