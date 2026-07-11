// Gabarits d'emails transactionnels Madger : design travaillé, cohérent avec
// la landing (fond #0A0A0A, accent #CBFF03, Inter). Compatible clients mail :
// tables + styles inline uniquement. Chaque fonction renvoie { subject, html }.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export type EmailLocale = "fr" | "en";

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
  locale?: EmailLocale;
}): string {
  const {
    preheader,
    eyebrow,
    title,
    intro,
    blocks = [],
    cta,
    outro,
    locale = "fr",
  } = opts;
  const F =
    locale === "en"
      ? {
          tagline: "Madger · the all-in-one app for independent coaches.",
          charter: "Payment charter",
          legal:
            "You are receiving this email because of activity linked to your Madger account or booking.",
        }
      : {
          tagline: "Madger · l'app tout-en-un des coachs indépendants.",
          charter: "Charte de paiement",
          legal:
            "Tu reçois cet email car une activité est liée à ton compte ou ta réservation Madger.",
        };
  return `<!DOCTYPE html>
<html lang="${locale}">
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
            ${F.tagline}<br>
            <a href="${APP_URL}" style="color:${C.muted};text-decoration:none;">madger.app</a>
            &nbsp;·&nbsp;
            <a href="${APP_URL}/charte-paiement" style="color:${C.muted};text-decoration:none;">${F.charter}</a>
            &nbsp;·&nbsp;
            <a href="mailto:contact@madger.app" style="color:${C.muted};text-decoration:none;">contact@madger.app</a>
          </p>
          <p style="margin:10px 0 0;font-size:11px;color:#3d3d3d;">${F.legal}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Rangée de liens secondaires (visio, calendrier) sous le récap.
function linksBlock(links: { label: string; url: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${FONT}padding:14px 0 0;">${links
    .map(
      (l) =>
        `<a href="${l.url}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;border:1px solid #2a2a2a;border-radius:999px;color:${C.text};font-size:13px;text-decoration:none;">${l.label}</a>`
    )
    .join("")}</td></tr></table>`;
}

// Liens visio + Google Calendar, seulement ceux qui existent.
function meetCalLinks(meetUrl?: string, calendarUrl?: string): string[] {
  const links = [
    ...(meetUrl ? [{ label: "🎥 Rejoindre la visio", url: meetUrl }] : []),
    ...(calendarUrl
      ? [{ label: "📅 Ajouter à Google Calendar", url: calendarUrl }]
      : []),
  ];
  return links.length ? [linksBlock(links)] : [];
}

// ── Client : confirmation de réservation payée ──────────────────────────────
export function bookingConfirmationClient(p: {
  coachName: string;
  dateStr: string;
  priceStr: string;
  online: boolean;
  reservationUrl: string;
  meetUrl?: string;
  calendarUrl?: string;
}): Email {
  return {
    subject: `Ta séance avec ${p.coachName} est confirmée ✅`,
    html: layout({
      preheader: `Séance confirmée ${p.dateStr} · paiement sécurisé jusqu'après la séance.`,
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
        ...meetCalLinks(p.meetUrl, p.calendarUrl),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro:
        "Astuce : ajoute la séance à ton agenda et préviens ton coach en avance si tu dois annuler : les conditions d'annulation sont indiquées sur ta réservation.",
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
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `New booking: ${p.clientName} · ${p.dateStr}`,
          preheader: `${p.clientName} booked and paid for "${p.serviceName}" · ${p.priceStr}.`,
          eyebrow: "New booking",
          title: "A client just booked 🎉",
          intro: `Good news: <b style="color:${C.text};">${p.clientName}</b> booked <b style="color:${C.text};">and paid for</b> a session. It's already in your calendar.`,
          client: "Client",
          service: "Service",
          dateTime: "Date & time",
          format: "Format",
          online: "Online",
          inPerson: "In person",
          amount: "Session amount",
          payoutTitle: "Payout",
          payoutBody: `The payment is held securely by Madger and will be <b style="color:${C.text};">transferred to your Stripe account 24 hours after the session</b>, minus the Madger commission and bank fees. The exact breakdown will arrive with your payout email.`,
          cta: "Open my calendar",
        }
      : {
          subject: `Nouvelle réservation : ${p.clientName} · ${p.dateStr}`,
          preheader: `${p.clientName} a réservé et payé « ${p.serviceName} » · ${p.priceStr}.`,
          eyebrow: "Nouvelle réservation",
          title: "Un client vient de réserver 🎉",
          intro: `Bonne nouvelle : <b style="color:${C.text};">${p.clientName}</b> a réservé <b style="color:${C.text};">et payé</b> une séance. Elle est déjà dans ton agenda.`,
          client: "Client",
          service: "Prestation",
          dateTime: "Date & heure",
          format: "Format",
          online: "En visio",
          inPerson: "En présentiel",
          amount: "Montant de la séance",
          payoutTitle: "Versement",
          payoutBody: `Le paiement est sécurisé par Madger et te sera <b style="color:${C.text};">transféré 24 h après la séance</b> sur ton compte Stripe, déduction faite de la commission Madger et des frais bancaires. Le détail exact arrive avec l'email de versement.`,
          cta: "Ouvrir mon agenda",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.service, value: p.serviceName },
          { label: L.dateTime, value: p.dateStr },
          { label: L.format, value: p.online ? L.online : L.inPerson },
          { label: L.amount, value: p.priceStr, accent: true },
        ]),
        infoBox(L.payoutTitle, L.payoutBody),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Client : demande de séance envoyée (ou confirmée si mode instantané) ────
export function requestReceivedClient(p: {
  coachName: string;
  dateStr: string;
  instant: boolean;
  reservationUrl: string;
  meetUrl?: string;
  calendarUrl?: string;
  // Empreinte bancaire (modèle Airbnb) : montant autorisé, débité seulement
  // si le coach accepte.
  authorizedPriceStr?: string;
}): Email {
  if (p.instant) {
    return {
      subject: `Séance confirmée avec ${p.coachName} ✅`,
      html: layout({
        preheader: `Ton créneau du ${p.dateStr} est confirmé.`,
        eyebrow: "Réservation confirmée",
        title: "C'est réservé 💪",
        intro: `Ton créneau du <b style="color:${C.text};">${p.dateStr}</b> avec <b style="color:${C.text};">${p.coachName}</b> est confirmé.`,
        blocks: meetCalLinks(p.meetUrl, p.calendarUrl),
        cta: { label: "Voir ma réservation", url: p.reservationUrl },
      }),
    };
  }
  return {
    subject: `Demande envoyée à ${p.coachName} ⏳`,
    html: layout({
      preheader: `${p.coachName} doit confirmer le créneau du ${p.dateStr}.`,
      eyebrow: "Demande envoyée",
      title: "Ta demande est partie",
      intro: `<b style="color:${C.text};">${p.coachName}</b> doit confirmer le créneau du <b style="color:${C.text};">${p.dateStr}</b>. Tu recevras un email dès sa réponse.`,
      blocks: p.authorizedPriceStr
        ? [
            infoBox(
              "Aucun débit pour l'instant",
              `Ta carte a été autorisée pour <b style="color:${C.text};">${p.authorizedPriceStr}</b>. Tu ne seras débité que si ${p.coachName} accepte la demande. Refus ou absence de réponse : rien n'est prélevé, l'empreinte disparaît d'elle-même.`
            ),
          ]
        : [],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
    }),
  };
}

// ── Coach : nouvelle demande de séance (gratuite) ───────────────────────────
export function newRequestCoach(p: {
  clientName: string;
  dateStr: string;
  online: boolean;
  instant: boolean;
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subjectInstant: `New session booked · ${p.clientName}`,
          subjectRequest: `✋ New session request · ${p.clientName}`,
          preheaderSuffix: " · awaiting your reply",
          eyebrowInstant: "New booking",
          eyebrowRequest: "Request to confirm",
          titleInstant: "A slot was just booked ⚡",
          titleRequest: "A client is waiting for your reply",
          introInstant: `Instant booking: the slot was confirmed automatically.`,
          introRequest: `Accept or decline the request from your calendar. Until you reply, the slot stays blocked for other clients.`,
          client: "Client",
          when: "When",
          format: "Format",
          online: "Online",
          inPerson: "In person",
          boxTitle: "You have 6 days to reply",
          boxBody:
            "The client's card authorization expires after that. If you don't reply within 6 days, the request is cancelled automatically and the client is never charged.",
          cta: "Open my calendar",
        }
      : {
          subjectInstant: `Nouvelle séance réservée · ${p.clientName}`,
          subjectRequest: `✋ Nouvelle demande de séance · ${p.clientName}`,
          preheaderSuffix: " · à confirmer",
          eyebrowInstant: "Nouvelle réservation",
          eyebrowRequest: "Demande à confirmer",
          titleInstant: "Un créneau vient d'être réservé ⚡",
          titleRequest: "Un client attend ta réponse",
          introInstant: `Réservation instantanée : le créneau est confirmé automatiquement.`,
          introRequest: `Confirme ou refuse la demande depuis ton agenda : sans réponse, le créneau reste bloqué pour les autres clients.`,
          client: "Client",
          when: "Quand",
          format: "Format",
          online: "En visio",
          inPerson: "En présentiel",
          boxTitle: "Tu as 6 jours pour répondre",
          boxBody:
            "L'empreinte bancaire du client expire ensuite : sans réponse de ta part sous 6 jours, la demande est annulée automatiquement et rien n'est débité au client.",
          cta: "Ouvrir mon agenda",
        };
  return {
    subject: p.instant ? L.subjectInstant : L.subjectRequest,
    html: layout({
      locale,
      preheader: `${p.clientName} · ${p.dateStr}${p.instant ? "" : L.preheaderSuffix}`,
      eyebrow: p.instant ? L.eyebrowInstant : L.eyebrowRequest,
      title: p.instant ? L.titleInstant : L.titleRequest,
      intro: p.instant ? L.introInstant : L.introRequest,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.when, value: p.dateStr },
          { label: L.format, value: p.online ? L.online : L.inPerson },
        ]),
        ...(p.instant ? [] : [infoBox(L.boxTitle, L.boxBody)]),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Client : rappel 24 h avant la séance ────────────────────────────────────
export function sessionReminderClient(p: {
  coachName: string;
  dateStr: string;
  online: boolean;
  reservationUrl: string;
  meetUrl?: string;
}): Email {
  return {
    subject: `C'est demain : séance avec ${p.coachName} ⏰`,
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
        ...meetCalLinks(p.meetUrl),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro: p.online
        ? "Pense à tester ta connexion et ton micro quelques minutes avant la séance. Bonne séance ! 💪"
        : "Prévois ta tenue, de quoi t'hydrater, et arrive quelques minutes en avance. Bonne séance ! 💪",
    }),
  };
}

// ── Client : rappel « ~1 h avant » la séance ────────────────────────────────
export function sessionReminderSoonClient(p: {
  coachName: string;
  timeStr: string; // heure de la séance (ex. « 14:00 »)
  online: boolean;
  reservationUrl: string;
  meetUrl?: string;
  address?: string; // adresse de la salle (présentiel)
}): Email {
  return {
    subject: `Dans 1h : séance avec ${p.coachName} 🏃`,
    html: layout({
      preheader: `Ta séance commence bientôt (${p.timeStr}).`,
      eyebrow: "Rappel de séance",
      title: "C'est bientôt l'heure",
      intro: `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> commence dans environ <b style="color:${C.text};">1 heure</b> (à ${p.timeStr}).`,
      blocks: [
        ...(p.online
          ? meetCalLinks(p.meetUrl)
          : p.address
            ? [detailsTable([{ label: "Adresse", value: p.address }])]
            : []),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro: p.online
        ? "Installe-toi au calme et teste ton micro. À tout de suite ! 💪"
        : "En route ! Pense à ta tenue et à de quoi t'hydrater. À tout de suite ! 💪",
    }),
  };
}

// ── Nouveau message reçu (coach ou client) ──────────────────────────────────
export function newMessageNotif(p: {
  senderName: string;
  preview: string;
  threadUrl: string;
  // Lien secondaire vers les séances (agenda côté coach, espace côté client).
  sessionsUrl?: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const safe = p.preview
    .slice(0, 300)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const L =
    locale === "en"
      ? {
          subject: `New message from ${p.senderName}`,
          eyebrow: "Messages",
          title: "New message",
          intro: `<b style="color:${C.text};">${p.senderName}</b> wrote to you:`,
          boxTitle: "Message",
          cta: "Reply",
          sessions: "View my sessions",
          outro:
            "Replying quickly makes all the difference: most clients pick the coach who answers first.",
        }
      : {
          subject: `Nouveau message de ${p.senderName}`,
          eyebrow: "Messagerie",
          title: "Nouveau message",
          intro: `<b style="color:${C.text};">${p.senderName}</b> t'a écrit :`,
          boxTitle: "Message",
          cta: "Répondre",
          sessions: "Voir mes séances",
          outro:
            "Répondre vite fait toute la différence : la plupart des clients choisissent le coach qui répond en premier.",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: p.preview.slice(0, 90),
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        infoBox(L.boxTitle, `« ${safe} »`),
        ...(p.sessionsUrl
          ? [linksBlock([{ label: L.sessions, url: p.sessionsUrl }])]
          : []),
      ],
      cta: { label: L.cta, url: p.threadUrl },
      outro: L.outro,
    }),
  };
}

// ── Client : abonnement mensuel démarré ─────────────────────────────────────
export function subscriptionStartedClient(p: {
  coachName: string;
  serviceName: string;
  priceStr: string;
}): Email {
  return {
    subject: `Ton abonnement chez ${p.coachName} est actif 🎉`,
    html: layout({
      preheader: `Abonnement ${p.serviceName} actif, ${p.priceStr} par mois.`,
      eyebrow: "Abonnement",
      title: "Abonnement actif",
      intro: `Ton abonnement <b style="color:${C.text};">${p.serviceName}</b> chez <b style="color:${C.text};">${p.coachName}</b> est en place. Ton coach va te contacter pour planifier vos séances.`,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Formule", value: p.serviceName },
          { label: "Montant", value: `${p.priceStr} / mois`, accent: true },
        ]),
      ],
      cta: { label: "Mes séances", url: `${APP_URL}/espace` },
      outro:
        "Le prélèvement a lieu chaque mois à la même date. Pour toute question ou pour arrêter l'abonnement, écris à ton coach ou réponds à cet email.",
    }),
  };
}

// ── Coach : nouvel abonné ────────────────────────────────────────────────────
export function subscriptionStartedCoach(p: {
  clientName: string;
  serviceName: string;
  priceStr: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `New subscriber: ${p.clientName} 🎉`,
          preheader: `${p.clientName} just subscribed to ${p.serviceName}.`,
          eyebrow: "Subscription",
          title: "New subscriber!",
          intro: `<b style="color:${C.text};">${p.clientName}</b> just subscribed to your <b style="color:${C.text};">${p.serviceName}</b> plan. The amount is paid out to you automatically every month. Reach out to your new client to schedule your sessions.`,
          client: "Client",
          plan: "Plan",
          amount: "Amount",
          perMonth: `${p.priceStr} / month`,
          cta: "Open my clients",
          outro: "Send them a welcome message today, it makes a difference.",
        }
      : {
          subject: `Nouvel abonné : ${p.clientName} 🎉`,
          preheader: `${p.clientName} vient de souscrire ${p.serviceName}.`,
          eyebrow: "Abonnement",
          title: "Nouvel abonné !",
          intro: `<b style="color:${C.text};">${p.clientName}</b> vient de souscrire ta formule <b style="color:${C.text};">${p.serviceName}</b>. Le montant t'est versé automatiquement chaque mois. Contacte ton nouveau client pour planifier vos séances.`,
          client: "Client",
          plan: "Formule",
          amount: "Montant",
          perMonth: `${p.priceStr} / mois`,
          cta: "Ouvrir mes clients",
          outro: "Pense à lui envoyer un message de bienvenue dès aujourd'hui.",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.plan, value: p.serviceName },
          { label: L.amount, value: L.perMonth, accent: true },
        ]),
      ],
      cta: { label: L.cta, url: `${APP_URL}/dashboard/clients` },
      outro: L.outro,
    }),
  };
}

// ── Client : demande déclinée / séance annulée SANS paiement en jeu ─────────
// ── Client : séance déplacée par le coach ────────────────────────────────
export function bookingRescheduledClient(p: {
  coachName: string;
  oldDateStr: string;
  dateStr: string;
  reservationUrl: string;
}): Email {
  return {
    subject: `Séance déplacée : ${p.dateStr}`,
    html: layout({
      preheader: `Nouvel horaire : ${p.dateStr}`,
      eyebrow: "Séance déplacée",
      title: "Ta séance a été déplacée",
      intro: `<b style="color:${C.text};">${p.coachName}</b> a déplacé votre séance.`,
      blocks: [
        infoBox(
          "Nouvel horaire",
          `Ancien horaire : <span style="text-decoration:line-through;">${p.oldDateStr}</span><br/>Nouvel horaire : <b style="color:${C.text};">${p.dateStr}</b>`
        ),
      ],
      cta: { label: "Voir ma réservation", url: p.reservationUrl },
      outro:
        "Un empêchement ? Réponds directement à cet email ou gère ta réservation depuis ton espace.",
    }),
  };
}

export function bookingCancelledClient(p: {
  coachName: string;
  dateStr: string;
  declined: boolean;
}): Email {
  const intro = p.declined
    ? `<b style="color:${C.text};">${p.coachName}</b> ne peut pas assurer la séance demandée. Rien n'a été débité, tu peux choisir un autre créneau en quelques secondes.`
    : `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> a été annulée. Aucun paiement n'était en jeu.`;
  return {
    subject: p.declined
      ? "Ta demande de séance n'a pas pu être acceptée"
      : "Ta séance a été annulée",
    html: layout({
      preheader: p.declined
        ? "Le coach ne peut pas assurer ce créneau. Choisis-en un autre."
        : "Séance annulée, aucun paiement en jeu.",
      eyebrow: "Réservation",
      title: p.declined ? "Demande déclinée" : "Séance annulée",
      intro,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Séance", value: p.dateStr },
        ]),
      ],
      cta: { label: "Choisir un autre créneau", url: `${APP_URL}/coachs` },
      outro:
        "Une question ? Réponds simplement à cet email, on est là pour aider.",
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
      preheader: `Remboursement de ${p.refundStr} émis, visible sous quelques jours ouvrés.`,
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
  // Commission Madger prélevée sur ce versement (coachs Gratuit) : ligne
  // dédiée + rappel « 0 % en Pro ». Absente = pas de ligne (coach Pro).
  commissionStr?: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `${p.payoutStr} sent to your account 💸`,
          preheader: `Session with ${p.clientName} completed: ${p.payoutStr} transferred to your Stripe account.`,
          eyebrow: "Payout sent",
          title: "You just got paid",
          intro: `Your session with <b style="color:${C.text};">${p.clientName}</b> went smoothly: your share has been transferred to your Stripe account.`,
          client: "Client",
          amount: "Amount paid out",
          commission: "Madger commission",
          availability: "Availability",
          availabilityValue: "Per your Stripe payout schedule",
          boxTitle: "With Pro, this commission would be 0",
          boxBody:
            "The Pro plan drops the Madger commission from 5% to 0% on every session you get paid for. If you get paid regularly, it pays for itself.",
          cta: "View my payments",
        }
      : {
          subject: `${p.payoutStr} versés sur ton compte 💸`,
          preheader: `Séance avec ${p.clientName} réglée : ${p.payoutStr} transférés vers ton compte Stripe.`,
          eyebrow: "Versement effectué",
          title: "Tu viens d'être payé",
          intro: `La séance avec <b style="color:${C.text};">${p.clientName}</b> est passée sans encombre : ta part a été transférée vers ton compte Stripe.`,
          client: "Client",
          amount: "Montant versé",
          commission: "Commission Madger",
          availability: "Disponibilité",
          availabilityValue: "Selon ton calendrier Stripe",
          boxTitle: "En Pro, cette commission serait de 0 €",
          boxBody:
            "Le plan Pro passe la commission Madger de 5 % à 0 % sur chaque séance encaissée. Si tu encaisses régulièrement, il se rembourse tout seul.",
          cta: "Voir mes paiements",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.amount, value: p.payoutStr, accent: true },
          ...(p.commissionStr
            ? [{ label: L.commission, value: p.commissionStr }]
            : []),
          { label: L.availability, value: L.availabilityValue },
        ]),
        ...(p.commissionStr ? [infoBox(L.boxTitle, L.boxBody)] : []),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
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
      preheader: `Note ta séance avec ${p.coachName} : 30 secondes, ça aide toute la communauté.`,
      eyebrow: "Ton avis compte",
      title: "Comment s'est passée ta séance ?",
      intro: `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> est terminée. Prends 30 secondes pour la noter : ton avis aide les autres à choisir leur coach, et ton coach à progresser.`,
      blocks: [
        infoBox(
          "Un avis par client",
          "Si tu refais des séances avec ce coach, tu pourras mettre ton avis à jour à tout moment : c'est ta note la plus récente qui compte."
        ),
      ],
      cta: { label: "⭐ Noter ma séance", url: p.reservationUrl },
    }),
  };
}

// ── Coach : le client a annulé sa séance ────────────────────────────────────
export function bookingCancelledCoach(p: {
  clientName: string;
  dateStr: string;
  refundStr: string | null; // null = aucune somme remboursée
  keptStr: string | null; // part conservée pour le coach (formule d'annulation)
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `${p.clientName} cancelled the session on ${p.dateStr}`,
          preheader: `The ${p.dateStr} slot is now free in your calendar.`,
          eyebrow: "Client cancellation",
          title: "A session was just cancelled",
          intro: `<b style="color:${C.text};">${p.clientName}</b> cancelled the session on <b style="color:${C.text};">${p.dateStr}</b>. The slot is available again in your calendar.`,
          client: "Client",
          session: "Session",
          refunded: "Refunded to the client",
          kept: "Kept for you (cancellation policy)",
          cta: "View my calendar",
        }
      : {
          subject: `${p.clientName} a annulé sa séance du ${p.dateStr}`,
          preheader: `Le créneau du ${p.dateStr} se libère dans ton agenda.`,
          eyebrow: "Annulation client",
          title: "Une séance vient d'être annulée",
          intro: `<b style="color:${C.text};">${p.clientName}</b> a annulé sa séance du <b style="color:${C.text};">${p.dateStr}</b>. Le créneau est de nouveau libre dans ton agenda.`,
          client: "Client",
          session: "Séance",
          refunded: "Remboursé au client",
          kept: "Conservé pour toi (formule d'annulation)",
          cta: "Voir mon agenda",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.session, value: p.dateStr },
          ...(p.refundStr
            ? [{ label: L.refunded, value: p.refundStr }]
            : []),
          ...(p.keptStr
            ? [{ label: L.kept, value: p.keptStr, accent: true }]
            : []),
        ]),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Coach : litige tranché par Madger ───────────────────────────────────────
export function disputeResolvedCoach(p: {
  clientName: string;
  payoutStr: string | null; // null = rien versé
  refundStr: string | null; // part remboursée au client
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: "Dispute resolved: the case is closed",
          preheader: "Madger reviewed the report and allocated the funds.",
          eyebrow: "Dispute resolved",
          title: "The dispute has been resolved",
          intro: `The report about your session with <b style="color:${C.text};">${p.clientName}</b> has been reviewed. Here is the outcome, in line with the payment charter.`,
          paidToYou: "Paid to your account",
          refunded: "Refunded to the client",
          boxTitle: "Questions about the decision?",
          boxBody:
            "Just reply to this email and explain your situation: someone from the Madger team will get back to you.",
          cta: "View my payments",
        }
      : {
          subject: "Litige tranché : le dossier est clos",
          preheader: "Madger a examiné le signalement et réparti les fonds.",
          eyebrow: "Litige résolu",
          title: "Le litige est tranché",
          intro: `Le signalement concernant ta séance avec <b style="color:${C.text};">${p.clientName}</b> a été examiné. Voici la répartition décidée, conformément à la charte de paiement.`,
          paidToYou: "Versé sur ton compte",
          refunded: "Remboursé au client",
          boxTitle: "Une question sur la décision ?",
          boxBody:
            "Réponds simplement à cet email en expliquant ta situation : un membre de l'équipe Madger te répondra.",
          cta: "Voir mes paiements",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          ...(p.payoutStr
            ? [{ label: L.paidToYou, value: p.payoutStr, accent: true }]
            : []),
          ...(p.refundStr
            ? [{ label: L.refunded, value: p.refundStr }]
            : []),
        ]),
        infoBox(L.boxTitle, L.boxBody),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Client : abonnement arrêté (fin en fin de période payée) ───────────────
export function subscriptionCancelledClient(p: {
  coachName: string;
  endDateStr: string | null;
}): Email {
  return {
    subject: `Ton abonnement chez ${p.coachName} s'arrête`,
    html: layout({
      preheader:
        "Ton abonnement reste actif jusqu'à la fin de la période déjà payée.",
      eyebrow: "Abonnement",
      title: "C'est noté, ton abonnement s'arrête",
      intro: `Ton abonnement chez <b style="color:${C.text};">${p.coachName}</b> ne sera pas renouvelé.${p.endDateStr ? ` Il reste actif jusqu'au <b style="color:${C.text};">${p.endDateStr}</b> : profite des séances restantes.` : ""} Aucun prélèvement supplémentaire n'aura lieu.`,
      blocks: [],
      cta: { label: "Mes séances", url: `${APP_URL}/espace` },
      outro:
        "Tu changes d'avis ? Tu peux te réabonner à tout moment depuis la page de ton coach.",
    }),
  };
}

// ── Coach : un abonné arrête son abonnement ─────────────────────────────────
export function subscriptionCancelledCoach(p: {
  clientName: string;
  endDateStr: string | null;
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `${p.clientName} is ending their subscription`,
          preheader:
            "The subscription stays active until the end of the paid period.",
          eyebrow: "Subscription",
          title: "A subscriber is leaving",
          intro: `<b style="color:${C.text};">${p.clientName}</b> ended their subscription.${p.endDateStr ? ` It stays active until <b style="color:${C.text};">${p.endDateStr}</b>.` : ""} A quick message from you can make a difference: ask what led to their decision.`,
          cta: "Open messages",
        }
      : {
          subject: `${p.clientName} arrête son abonnement`,
          preheader:
            "L'abonnement reste actif jusqu'à la fin de la période payée.",
          eyebrow: "Abonnement",
          title: "Un abonné s'arrête",
          intro: `<b style="color:${C.text};">${p.clientName}</b> a mis fin à son abonnement.${p.endDateStr ? ` Il reste actif jusqu'au <b style="color:${C.text};">${p.endDateStr}</b>.` : ""} Un petit message de ta part peut faire la différence : demande-lui ce qui a motivé son choix.`,
          cta: "Ouvrir la messagerie",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Coach : bienvenue dans le plan Pro ──────────────────────────────────────
export function proWelcomeCoach(p: {
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: "Welcome to Pro: 0% commission starting now 🎉",
          preheader:
            "Your Pro plan is active: 0% commission, advanced stats unlocked.",
          eyebrow: "Pro plan",
          title: "Your Pro plan is active",
          intro: `From now on, <b style="color:${C.text};">you keep 100% of what you earn</b>: the Madger commission drops to 0% on all your sessions. Your advanced stats are unlocked on your dashboard.`,
          boxTitle: "Your invoice",
          boxBody:
            "Stripe sends you the receipt for your subscription. You can manage your subscription at any time from the Subscription page.",
          cta: "View my stats",
        }
      : {
          subject: "Bienvenue en Pro : 0 % de commission dès maintenant 🎉",
          preheader:
            "Ton plan Pro est actif : 0 % de commission, stats avancées débloquées.",
          eyebrow: "Plan Pro",
          title: "Ton plan Pro est actif",
          intro: `À partir de maintenant, <b style="color:${C.text};">tu gardes 100 % de ce que tu encaisses</b> : la commission Madger passe à 0 % sur toutes tes séances. Tes statistiques avancées sont débloquées sur ton dashboard.`,
          boxTitle: "Ta facture",
          boxBody:
            "Le reçu de ton abonnement t'est envoyé par Stripe. Tu peux gérer ton abonnement à tout moment depuis la page Abonnement.",
          cta: "Voir mes statistiques",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [infoBox(L.boxTitle, L.boxBody)],
      cta: { label: L.cta, url: p.dashboardUrl },
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
    subject: `⚠️ Litige à trancher : ${p.clientName} / ${p.coachName} (${p.amountStr})`,
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

// ── Coach : un client a signalé un problème (litige ouvert) ─────────────────
export function disputeOpenedCoach(p: {
  clientName: string;
  amountStr: string;
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: "A report is under review on one of your sessions",
          preheader: `The ${p.amountStr} payout is paused while Madger reviews the report.`,
          eyebrow: "Report under review",
          title: "A client reported an issue",
          intro: `<b style="color:${C.text};">${p.clientName}</b> reported an issue about a session. This happens and does not imply anything about you: the Madger team simply reviews the situation with both sides, as set out in the payment charter.`,
          client: "Client",
          amount: "Amount on hold",
          boxTitle: "Payout paused",
          boxBody: `The payout for this session is <b style="color:${C.text};">on hold during the review</b>. Nothing is decided yet: once the review is done, the funds are allocated and you receive an email with the outcome.`,
          cta: "View my payments",
          outro:
            "You can reply to this email to share your side of the story: it helps the team decide fairly and quickly.",
        }
      : {
          subject: "Un signalement est en cours d'examen sur une de tes séances",
          preheader: `Le versement de ${p.amountStr} est en pause le temps de l'examen.`,
          eyebrow: "Signalement en cours",
          title: "Un client a signalé un problème",
          intro: `<b style="color:${C.text};">${p.clientName}</b> a signalé un problème sur une séance. Ça arrive et ça ne présume rien te concernant : l'équipe Madger examine simplement la situation avec les deux parties, comme le prévoit la charte de paiement.`,
          client: "Client",
          amount: "Montant en attente",
          boxTitle: "Versement en pause",
          boxBody: `Le versement de cette séance est <b style="color:${C.text};">gelé le temps de l'examen</b>. Rien n'est encore décidé : une fois l'examen terminé, les fonds sont répartis et tu reçois un email avec la décision.`,
          cta: "Voir mes paiements",
          outro:
            "Tu peux répondre à cet email pour donner ta version des faits : ça aide l'équipe à trancher vite et juste.",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.amount, value: p.amountStr, accent: true },
        ]),
        infoBox(L.boxTitle, L.boxBody),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
      outro: L.outro,
    }),
  };
}

// ── Client : accusé de réception d'un signalement ───────────────────────────
export function disputeReceivedClient(p: {
  coachName: string;
  amountStr: string;
  reservationUrl?: string;
}): Email {
  return {
    subject: "Ton signalement est bien reçu ✅",
    html: layout({
      preheader: `Les fonds (${p.amountStr}) sont gelés le temps de l'examen.`,
      eyebrow: "Signalement reçu",
      title: "On s'en occupe",
      intro: `Ton signalement concernant ta séance avec <b style="color:${C.text};">${p.coachName}</b> est bien enregistré. L'équipe Madger examine la situation et revient vers toi rapidement.`,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Montant gelé", value: p.amountStr, accent: true },
        ]),
        infoBox(
          "Fonds gelés",
          `Le paiement de <b style="color:${C.text};">${p.amountStr}</b> est gelé le temps de l'examen : rien n'est versé au coach tant que l'équipe n'a pas tranché, conformément à la charte de paiement.`
        ),
      ],
      cta: p.reservationUrl
        ? { label: "Voir ma réservation", url: p.reservationUrl }
        : undefined,
      outro:
        "Tu peux répondre à cet email pour ajouter des précisions ou des éléments : tout est pris en compte dans l'examen.",
    }),
  };
}

// ── Client : litige tranché par Madger ──────────────────────────────────────
export function disputeResolvedClient(p: {
  refunded: boolean;
  refundStr?: string | null;
}): Email {
  if (p.refunded && p.refundStr) {
    return {
      subject: "Litige tranché : ton remboursement arrive 💸",
      html: layout({
        preheader: `Remboursement de ${p.refundStr} émis suite à ton signalement.`,
        eyebrow: "Litige résolu",
        title: "Le litige est tranché",
        intro: `Ton signalement a été examiné par l'équipe Madger : tu as été remboursé de <b style="color:${C.text};">${p.refundStr}</b>, conformément à la charte de paiement.`,
        blocks: [
          detailsTable([
            { label: "Montant remboursé", value: p.refundStr, accent: true },
            { label: "Délai bancaire", value: "2 à 7 jours ouvrés" },
          ]),
        ],
        cta: { label: "Trouver un coach", url: `${APP_URL}/coachs` },
        outro:
          "Le remboursement apparaîtra sur le moyen de paiement utilisé lors de la réservation. Une question sur la décision ? Réponds simplement à cet email.",
      }),
    };
  }
  return {
    subject: "Litige tranché : le dossier est clos",
    html: layout({
      preheader: "Ton signalement a été examiné, voici la décision.",
      eyebrow: "Litige résolu",
      title: "Le litige est tranché",
      intro: `Ton signalement a été examiné par l'équipe Madger. Après étude des éléments des deux parties, il n'a pas été retenu : le paiement de la séance est versé au coach, conformément à la charte de paiement.`,
      blocks: [
        infoBox(
          "Une question sur la décision ?",
          "Réponds simplement à cet email en expliquant ta situation : un membre de l'équipe Madger te répondra."
        ),
      ],
      cta: { label: "Charte de paiement", url: `${APP_URL}/charte-paiement` },
    }),
  };
}

// ── Coach : échéance d'abonnement client encaissée ──────────────────────────
export function subscriptionPaymentCoach(p: {
  clientName: string;
  amountStr: string;
  // Commission Madger prélevée sur cette échéance (coachs Gratuit). Absente =
  // pas de ligne (coach Pro, 0 %).
  commissionStr?: string;
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: `Subscription payment received: ${p.amountStr} 💸`,
          preheader: `${p.clientName}'s monthly payment went through: ${p.amountStr}.`,
          eyebrow: "Subscription payment",
          title: "A monthly payment just came in",
          intro: `<b style="color:${C.text};">${p.clientName}</b>'s monthly subscription payment went through. The amount is paid straight to your Stripe account.`,
          client: "Client",
          amount: "Amount collected",
          commission: "Madger commission",
          cta: "View my payments",
        }
      : {
          subject: `Échéance d'abonnement encaissée : ${p.amountStr} 💸`,
          preheader: `Le prélèvement mensuel de ${p.clientName} est passé : ${p.amountStr}.`,
          eyebrow: "Échéance d'abonnement",
          title: "Une échéance vient d'être encaissée",
          intro: `Le prélèvement mensuel de l'abonnement de <b style="color:${C.text};">${p.clientName}</b> est bien passé. Le montant est versé directement sur ton compte Stripe.`,
          client: "Client",
          amount: "Montant encaissé",
          commission: "Commission Madger",
          cta: "Voir mes paiements",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [
        detailsTable([
          { label: L.client, value: p.clientName },
          { label: L.amount, value: p.amountStr, accent: true },
          ...(p.commissionStr
            ? [{ label: L.commission, value: p.commissionStr }]
            : []),
        ]),
      ],
      cta: { label: L.cta, url: p.dashboardUrl },
    }),
  };
}

// ── Client : échec du prélèvement de l'abonnement mensuel ───────────────────
export function subscriptionPaymentFailedClient(p: {
  coachName: string;
}): Email {
  return {
    subject: "Le prélèvement de ton abonnement a échoué ⚠️",
    html: layout({
      preheader:
        "Mets à jour ta carte pour garder ton abonnement actif.",
      eyebrow: "Abonnement",
      title: "Ton prélèvement n'est pas passé",
      intro: `Le prélèvement mensuel de ton abonnement chez <b style="color:${C.text};">${p.coachName}</b> a échoué (carte expirée, plafond, solde insuffisant...). Pas de panique : mets à jour ta carte pour que tout rentre dans l'ordre.`,
      blocks: [
        infoBox(
          "Que se passe-t-il maintenant ?",
          "Le prélèvement est retenté automatiquement dans les prochains jours. Si le paiement échoue à nouveau, ton abonnement risque d'être suspendu."
        ),
      ],
      cta: { label: "Mettre à jour ma carte", url: `${APP_URL}/espace` },
      outro:
        "Une question ? Réponds simplement à cet email ou écris à ton coach.",
    }),
  };
}

// ── Coach : abonnement Pro terminé (retour en Basic) ────────────────────────
export function proCancelledCoach(p: {
  dashboardUrl: string;
  locale?: EmailLocale;
}): Email {
  const locale = p.locale ?? "fr";
  const L =
    locale === "en"
      ? {
          subject: "Your Pro plan has ended",
          preheader:
            "Your account is back on Madger Basic. You can reactivate Pro anytime.",
          eyebrow: "Pro plan",
          title: "Back to Madger Basic",
          intro: `Your Pro subscription has ended and your account is back on <b style="color:${C.text};">Madger Basic</b>. Nothing else changes: your calendar, clients and payments keep working exactly the same. The only difference is that the <b style="color:${C.text};">5% Madger commission</b> applies again to your sessions.`,
          boxTitle: "Come back whenever you want",
          boxBody:
            "Reactivate Pro in two clicks to get back to 0% commission and your advanced stats. Your data is right where you left it.",
          cta: "Reactivate Pro",
          outro:
            "Thanks for having tried Pro. If something did not fit, just reply to this email: your feedback really helps us improve.",
        }
      : {
          subject: "Ton plan Pro est terminé",
          preheader:
            "Ton compte repasse en Madger Basic. Tu peux réactiver Pro à tout moment.",
          eyebrow: "Plan Pro",
          title: "Retour en Madger Basic",
          intro: `Ton abonnement Pro est arrivé à son terme : ton compte repasse en <b style="color:${C.text};">Madger Basic</b>. Rien d'autre ne change : ton agenda, tes clients et tes paiements continuent de fonctionner exactement pareil. Seule différence : la <b style="color:${C.text};">commission Madger de 5 %</b> s'applique de nouveau sur tes séances.`,
          boxTitle: "Tu peux revenir quand tu veux",
          boxBody:
            "Réactive Pro en deux clics pour retrouver 0 % de commission et tes statistiques avancées. Tes données sont restées exactement là où tu les as laissées.",
          cta: "Réactiver Pro",
          outro:
            "Merci d'avoir essayé Pro. Si quelque chose ne t'a pas convenu, réponds simplement à cet email : ton retour nous aide vraiment à progresser.",
        };
  return {
    subject: L.subject,
    html: layout({
      locale,
      preheader: L.preheader,
      eyebrow: L.eyebrow,
      title: L.title,
      intro: L.intro,
      blocks: [infoBox(L.boxTitle, L.boxBody)],
      cta: { label: L.cta, url: p.dashboardUrl },
      outro: L.outro,
    }),
  };
}

// ── Client : annulation confirmée, sans remboursement (formule du coach) ────
export function cancellationNoRefundClient(p: {
  coachName: string;
  dateStr: string;
}): Email {
  return {
    subject: "Ton annulation est confirmée",
    html: layout({
      preheader:
        "Séance annulée. Aucun remboursement selon la formule d'annulation du coach.",
      eyebrow: "Annulation",
      title: "Séance annulée",
      intro: `Ta séance avec <b style="color:${C.text};">${p.coachName}</b> du <b style="color:${C.text};">${p.dateStr}</b> est bien annulée. Le créneau est libéré.`,
      blocks: [
        detailsTable([
          { label: "Coach", value: p.coachName },
          { label: "Séance", value: p.dateStr },
          { label: "Montant remboursé", value: "0 €" },
        ]),
        infoBox(
          "Pourquoi aucun remboursement ?",
          `D'après la formule d'annulation de ${p.coachName}, cette annulation intervient trop tard pour donner droit à un remboursement : le montant de la séance est conservé par le coach. Les conditions exactes sont affichées sur ta réservation.`
        ),
      ],
      cta: { label: "Choisir un autre créneau", url: `${APP_URL}/coachs` },
      outro:
        "Une question ? Réponds simplement à cet email, on est là pour aider.",
    }),
  };
}
