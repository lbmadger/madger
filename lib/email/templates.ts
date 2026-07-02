// Gabarits d'emails transactionnels Madger — design travaillé, cohérent avec
// la landing (fond #0A0A0A, accent #CBFF03, Inter). Compatible clients mail :
// tables + styles inline uniquement. Chaque fonction renvoie { subject, html }.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

type Email = { subject: string; html: string };

// ── Palette / typographie ───────────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  card: "#111112",
  cardSoft: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  accent: "#CBFF03",
  accentSoftBg: "rgba(203,255,3,0.06)",
  accentSoftBorder: "rgba(203,255,3,0.28)",
  text: "#F2F2F2",
  muted: "#9A9A9A",
  dim: "#5F5F5F",
};
const FONT =
  "font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

// Ligne de détail (libellé à gauche, valeur à droite).
export type DetailRow = { label: string; value: string; accent?: boolean };

function detailsTable(rows: DetailRow[]): string {
  const trs = rows
    .map((r, i) => {
      const border =
        i < rows.length - 1
          ? `border-bottom:1px solid ${C.border};`
          : "";
      return `<tr>
        <td style="${FONT}padding:13px 18px;${border}font-size:13px;color:${C.muted};white-space:nowrap;">${r.label}</td>
        <td align="right" style="${FONT}padding:13px 18px;${border}font-size:14px;font-weight:${r.accent ? "800" : "600"};color:${r.accent ? C.accent : C.text};">${r.value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardSoft};border:1px solid ${C.border};border-radius:14px;border-collapse:separate;margin:22px 0 0;">${trs}</table>`;
}

// Encart d'information (ex. paiement sécurisé).
function infoBox(title: string, body: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.accentSoftBg};border:1px solid ${C.accentSoftBorder};border-radius:12px;border-collapse:separate;margin:18px 0 0;">
    <tr><td style="${FONT}padding:14px 18px;">
      <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.04em;color:${C.accent};text-transform:uppercase;">${title}</p>
      <p style="margin:6px 0 0;font-size:13px;line-height:1.65;color:${C.muted};">${body}</p>
    </td></tr>
  </table>`;
}

// Enveloppe commune : préheader invisible, logo, carte, CTA, pied de page.
function layout(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro?: string;
  blocks?: string[];
  cta?: { label: string; url: string };
  outro?: string;
}): string {
  const { preheader, eyebrow, title, intro, blocks = [], cta, outro } = opts;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <!-- Préheader : visible dans l'aperçu de la boîte mail, pas dans l'email -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
    <tr><td align="center" style="padding:44px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td align="center" style="${FONT}padding:0 0 26px;">
          <a href="${APP_URL}" style="text-decoration:none;">
            <span style="font-size:20px;font-weight:900;letter-spacing:0.06em;color:${C.accent};">MADGER</span>
          </a>
        </td></tr>

        <!-- Carte principale -->
        <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:20px;padding:38px 34px 34px;">
          <p style="${FONT}margin:0;font-size:11px;font-weight:800;color:${C.accent};letter-spacing:0.14em;text-transform:uppercase;">${eyebrow}</p>
          <h1 style="${FONT}margin:10px 0 0;font-size:25px;line-height:1.22;font-weight:800;letter-spacing:-0.02em;color:${C.text};">${title}</h1>
          ${intro ? `<p style="${FONT}margin:12px 0 0;font-size:14px;line-height:1.7;color:${C.muted};">${intro}</p>` : ""}
          ${blocks.join("")}
          ${
            cta
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td align="center">
                   <a href="${cta.url}" style="${FONT}display:block;background:${C.accent};color:#000;font-size:15px;font-weight:800;letter-spacing:-0.01em;padding:15px 32px;border-radius:100px;text-decoration:none;text-align:center;">${cta.label}</a>
                 </td></tr></table>`
              : ""
          }
          ${outro ? `<p style="${FONT}margin:22px 0 0;font-size:13px;line-height:1.7;color:${C.dim};">${outro}</p>` : ""}
        </td></tr>

        <!-- Pied de page -->
        <tr><td align="center" style="${FONT}padding:26px 12px 0;">
          <p style="margin:0;font-size:12px;line-height:1.8;color:${C.dim};">
            Madger — l'app tout-en-un des coachs indépendants.<br>
            <a href="${APP_URL}" style="color:${C.muted};text-decoration:none;">madger.app</a>
            &nbsp;·&nbsp;
            <a href="${APP_URL}/charte-paiement" style="color:${C.muted};text-decoration:none;">Charte de paiement</a>
            &nbsp;·&nbsp;
            <a href="mailto:contact@madger.app" style="color:${C.muted};text-decoration:none;">contact@madger.app</a>
          </p>
          <p style="margin:10px 0 0;font-size:11px;color:#3d3d3d;">Tu reçois cet email car une activité est liée à ton compte ou ta réservation Madger.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Client : confirmation de réservation payée ──────────────────────────────
export function bookingConfirmationClient(p: {
  coachName: string;
  dateStr: string;
  priceStr: string;
  online: boolean;
  reservationUrl: string;
}): Email {
  return {
    subject: `Ta séance avec ${p.coachName} est confirmée ✅`,
    html: layout({
      preheader: `Séance confirmée ${p.dateStr} — paiement sécurisé jusqu'après la séance.`,
      eyebrow: "Réservation confirmée",
      title: "C'est réservé. À toi de jouer 💪",
      intro: `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> est confirmée et ton paiement est bien enregistré. Voici le récap :`,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Date & heure", value: p.dateStr },
          { label: "Format", value: p.online ? "En visio" : "En présentiel" },
          { label: "Montant réglé", value: p.priceStr, accent: true },
        ]),
        infoBox(
          "Paiement sécurisé",
          `Ton argent est conservé par Madger et n'est versé au coach que <b style="color:${C.text};">24 h après la séance</b>. Un imprévu ? Tu peux signaler un problème depuis ta réservation, les fonds restent bloqués le temps qu'on tranche.`
        ),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro:
        "Astuce : ajoute la séance à ton agenda et préviens ton coach en avance si tu dois annuler — les conditions d'annulation sont indiquées sur ta réservation.",
    }),
  };
}

// ── Coach : nouvelle réservation payée ──────────────────────────────────────
export function bookingNotificationCoach(p: {
  clientName: string;
  dateStr: string;
  serviceName: string;
  priceStr: string;
  online: boolean;
  dashboardUrl: string;
}): Email {
  return {
    subject: `Nouvelle réservation — ${p.clientName} · ${p.dateStr}`,
    html: layout({
      preheader: `${p.clientName} a réservé et payé « ${p.serviceName} » — ${p.priceStr}.`,
      eyebrow: "Nouvelle réservation",
      title: "Un client vient de réserver 🎉",
      intro: `Bonne nouvelle : <b style="color:${C.text};">${p.clientName}</b> a réservé <b style="color:${C.text};">et payé</b> une séance. Elle est déjà dans ton agenda.`,
      blocks: [
        detailsTable([
          { label: "Client", value: p.clientName },
          { label: "Prestation", value: p.serviceName },
          { label: "Date & heure", value: p.dateStr },
          { label: "Format", value: p.online ? "En visio" : "En présentiel" },
          { label: "Montant encaissé", value: p.priceStr, accent: true },
        ]),
        infoBox(
          "Versement",
          `Le paiement est sécurisé par Madger et te sera <b style="color:${C.text};">transféré 24 h après la séance</b>, directement sur ton compte Stripe.`
        ),
      ],
      cta: { label: "Ouvrir mon agenda", url: p.dashboardUrl },
    }),
  };
}

// ── Client : rappel 24 h avant la séance ────────────────────────────────────
export function sessionReminderClient(p: {
  coachName: string;
  dateStr: string;
  online: boolean;
  reservationUrl: string;
}): Email {
  return {
    subject: `C'est demain — séance avec ${p.coachName} ⏰`,
    html: layout({
      preheader: `Rappel : ta séance a lieu ${p.dateStr}.`,
      eyebrow: "Rappel de séance",
      title: "Ta séance approche",
      intro: `Petit rappel : ta séance avec <b style="color:${C.text};">${p.coachName}</b> a lieu <b style="color:${C.text};">${p.dateStr}</b>.`,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Date & heure", value: p.dateStr },
          { label: "Format", value: p.online ? "En visio" : "En présentiel" },
        ]),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro: p.online
        ? "Pense à tester ta connexion et ton micro quelques minutes avant la séance. Bonne session ! 💪"
        : "Prévois ta tenue, de quoi t'hydrater, et arrive quelques minutes en avance. Bonne session ! 💪",
    }),
  };
}

// ── Client : remboursement suite à annulation ou litige ─────────────────────
export function refundClient(p: {
  coachName: string;
  refundStr: string;
  reason: "cancellation" | "dispute";
}): Email {
  const intro =
    p.reason === "dispute"
      ? `Suite à l'examen de ton signalement, un remboursement de <b style="color:${C.text};">${p.refundStr}</b> a été émis.`
      : `Suite à l'annulation de ta séance avec <b style="color:${C.text};">${p.coachName}</b>, un remboursement de <b style="color:${C.text};">${p.refundStr}</b> a été émis.`;
  return {
    subject: `Ton remboursement de ${p.refundStr} est en route 💸`,
    html: layout({
      preheader: `Remboursement de ${p.refundStr} émis — visible sous quelques jours ouvrés.`,
      eyebrow: "Remboursement",
      title: "Remboursement émis",
      intro,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Montant remboursé", value: p.refundStr, accent: true },
          { label: "Délai bancaire", value: "2 à 7 jours ouvrés" },
        ]),
      ],
      cta: { label: "Trouver un coach", url: `${APP_URL}/coachs` },
      outro:
        "Le remboursement apparaîtra sur le moyen de paiement utilisé lors de la réservation. Une question ? Réponds simplement à cet email.",
    }),
  };
}

// ── Coach : fonds libérés (séance réglée) ───────────────────────────────────
export function payoutReleasedCoach(p: {
  clientName: string;
  payoutStr: string;
  dashboardUrl: string;
}): Email {
  return {
    subject: `${p.payoutStr} versés sur ton compte 💸`,
    html: layout({
      preheader: `Séance avec ${p.clientName} réglée — ${p.payoutStr} transférés vers ton compte Stripe.`,
      eyebrow: "Versement effectué",
      title: "Tu viens d'être payé",
      intro: `La séance avec <b style="color:${C.text};">${p.clientName}</b> est passée sans encombre : ta part a été transférée vers ton compte Stripe.`,
      blocks: [
        detailsTable([
          { label: "Client", value: p.clientName },
          { label: "Montant versé", value: p.payoutStr, accent: true },
          { label: "Disponibilité", value: "Selon ton calendrier Stripe" },
        ]),
      ],
      cta: { label: "Voir mes paiements", url: p.dashboardUrl },
    }),
  };
}

// ── Client : demande d'avis après la séance ─────────────────────────────────
export function reviewRequestClient(p: {
  coachName: string;
  reservationUrl: string;
}): Email {
  return {
    subject: `Comment s'est passée ta séance avec ${p.coachName} ? ⭐`,
    html: layout({
      preheader: `Note ta séance avec ${p.coachName} — 30 secondes, ça aide toute la communauté.`,
      eyebrow: "Ton avis compte",
      title: "Comment s'est passée ta séance ?",
      intro: `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> est terminée. Prends 30 secondes pour la noter : ton avis aide les autres à choisir leur coach — et ton coach à progresser.`,
      blocks: [
        infoBox(
          "Un avis par client",
          "Si tu refais des séances avec ce coach, tu pourras mettre ton avis à jour à tout moment — c'est ta note la plus récente qui compte."
        ),
      ],
      cta: { label: "⭐ Noter ma séance", url: p.reservationUrl },
    }),
  };
}

// ── Admin : nouveau litige à trancher ───────────────────────────────────────
export function disputeOpenedAdmin(p: {
  clientName: string;
  coachName: string;
  amountStr: string;
  reason: string | null;
  adminUrl: string;
}): Email {
  return {
    subject: `⚠️ Litige à trancher — ${p.clientName} / ${p.coachName} (${p.amountStr})`,
    html: layout({
      preheader: `Fonds gelés : ${p.amountStr}. Décision à prendre selon la charte.`,
      eyebrow: "Litige · action requise",
      title: "Un client a signalé un problème",
      intro: `Les fonds sont <b style="color:${C.text};">gelés</b> en attendant ta décision, conformément à la charte de paiement.`,
      blocks: [
        detailsTable([
          { label: "Client", value: p.clientName },
          { label: "Coach", value: p.coachName },
          { label: "Montant gelé", value: p.amountStr, accent: true },
        ]),
        ...(p.reason
          ? [
              infoBox(
                "Motif du signalement",
                p.reason.replace(/</g, "&lt;").replace(/>/g, "&gt;")
              ),
            ]
          : []),
      ],
      cta: { label: "Trancher le litige", url: p.adminUrl },
      outro:
        "Rappel charte : séance non assurée → remboursement intégral ; non conforme → total ou partiel selon les éléments ; séance correctement assurée ou signalement injustifié → versement au coach.",
    }),
  };
}
