// Gabarits d'emails transactionnels Madger (dark, accent #CBFF03), cohérents
// avec l'email des codes promo. Chaque fonction renvoie { subject, html }.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

type Email = { subject: string; html: string };

// Enveloppe commune : en-tête, carte, pied de page.
function layout(opts: {
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
}): string {
  const { eyebrow, title, bodyHtml, cta } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
        <tr><td style="padding:32px;">
          ${eyebrow ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#CBFF03;letter-spacing:0.08em;text-transform:uppercase;">${eyebrow}</p>` : ""}
          <h1 style="margin:0 0 16px;font-size:22px;color:#fff;line-height:1.25;">${title}</h1>
          <div style="font-size:14px;color:#9a9a9a;line-height:1.7;">${bodyHtml}</div>
          ${
            cta
              ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td align="center">
                   <a href="${cta.url}" style="display:inline-block;background:#CBFF03;color:#000;font-size:14px;font-weight:800;padding:14px 32px;border-radius:100px;text-decoration:none;">${cta.label}</a>
                 </td></tr></table>`
              : ""
          }
          <p style="margin:28px 0 0;font-size:12px;color:#555;line-height:1.6;">Madger · le tout-en-un des coachs sportifs<br/><a href="${APP_URL}" style="color:#777;">madger.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function row(label: string, value: string): string {
  return `<p style="margin:0 0 8px;"><span style="color:#666;">${label} :</span> <b style="color:#fff;">${value}</b></p>`;
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
    subject: `Séance confirmée avec ${p.coachName} ✅`,
    html: layout({
      eyebrow: "Réservation confirmée",
      title: "Ta séance est réservée 💪",
      bodyHtml: `
        ${row("Coach", p.coachName)}
        ${row("Quand", p.dateStr)}
        ${row("Format", p.online ? "En visio" : "En présentiel")}
        ${row("Montant", p.priceStr)}
        <p style="margin:16px 0 0;">Ton paiement est <b style="color:#fff;">sécurisé</b> : l'argent est versé au coach 24 h après la séance. Un souci ? Tu peux signaler un problème depuis ta réservation.</p>`,
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
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
    subject: `Nouvelle séance réservée · ${p.clientName}`,
    html: layout({
      eyebrow: "Nouvelle réservation",
      title: "Un client vient de réserver 🎉",
      bodyHtml: `
        ${row("Client", p.clientName)}
        ${row("Prestation", p.serviceName)}
        ${row("Quand", p.dateStr)}
        ${row("Format", p.online ? "En visio" : "En présentiel")}
        ${row("Montant", p.priceStr)}
        <p style="margin:16px 0 0;">Le paiement est encaissé et sécurisé. Tu seras crédité 24 h après la séance.</p>`,
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
    subject: `Rappel : séance demain avec ${p.coachName}`,
    html: layout({
      eyebrow: "Rappel",
      title: "Ta séance approche ⏰",
      bodyHtml: `
        ${row("Coach", p.coachName)}
        ${row("Quand", p.dateStr)}
        ${row("Format", p.online ? "En visio" : "En présentiel")}
        <p style="margin:16px 0 0;">Pense à prévoir ta tenue et de quoi t'hydrater. À demain !</p>`,
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
    }),
  };
}

// ── Client : remboursement suite à annulation ───────────────────────────────
export function refundClient(p: {
  coachName: string;
  refundStr: string;
  reason: "cancellation" | "dispute";
}): Email {
  return {
    subject: `Remboursement de ${p.refundStr}`,
    html: layout({
      eyebrow: "Remboursement",
      title: "Ton remboursement est en route",
      bodyHtml: `
        ${row("Coach", p.coachName)}
        ${row("Montant remboursé", p.refundStr)}
        <p style="margin:16px 0 0;">Le remboursement apparaîtra sur ton moyen de paiement sous quelques jours ouvrés, selon ta banque.</p>`,
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
    subject: `Séance réglée · ${p.payoutStr} versés`,
    html: layout({
      eyebrow: "Versement",
      title: "Tu viens d'être payé 💸",
      bodyHtml: `
        ${row("Client", p.clientName)}
        ${row("Montant versé", p.payoutStr)}
        <p style="margin:16px 0 0;">Les fonds ont été transférés vers ton compte Stripe.</p>`,
      cta: { label: "Voir mes paiements", url: p.dashboardUrl },
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
    subject: `⚠️ Litige à trancher · ${p.clientName} / ${p.coachName}`,
    html: layout({
      eyebrow: "Litige",
      title: "Un client a signalé un problème",
      bodyHtml: `
        ${row("Client", p.clientName)}
        ${row("Coach", p.coachName)}
        ${row("Montant gelé", p.amountStr)}
        ${p.reason ? `<p style="margin:12px 0 0;color:#666;">Motif :</p><p style="margin:4px 0 0;color:#ccc;">${p.reason}</p>` : ""}`,
      cta: { label: "Trancher le litige", url: p.adminUrl },
    }),
  };
}
