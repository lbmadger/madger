// Envoi de SMS via l'API REST Twilio, sans SDK (une requête HTTP signée en
// Basic auth). Les identifiants vivent uniquement côté serveur :
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (numéro E.164 ou
// « MGxxxx » pour un Messaging Service, qui gère l'expéditeur alphanumérique
// « Madger » en France). Comme l'email : renvoie false au lieu de planter,
// pour ne jamais retenir un cron ou une réservation.
//
// Coût : ~0,08 € par SMS en France, à la charge de Madger (réglage Pro).

const TIMEOUT_MS = 10_000;
const MAX_LEN = 320; // 2 segments GSM-7 : au-delà, on tronque.

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
  );
}

export async function sendSms(opts: { to: string; body: string }): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from || !opts.to) return false;
  const body = opts.body.length > MAX_LEN ? `${opts.body.slice(0, MAX_LEN - 1)}…` : opts.body;
  const params = new URLSearchParams({ To: opts.to, Body: body });
  if (from.startsWith("MG")) params.set("MessagingServiceSid", from);
  else params.set("From", from);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      console.error("sendSms failed:", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendSms error:", e);
    return false;
  }
}

// Texte du rappel J-1. Court, sans lien de désinscription : le SMS est lié à
// une séance que le client a lui-même réservée (notification de service).
export function sessionReminderSms(p: {
  firstName?: string | null;
  coachName: string;
  dateStr: string;
  placeStr?: string | null;
  online: boolean;
  url: string;
}): string {
  const hi = p.firstName ? `${p.firstName}, ` : "";
  const where = p.online ? "en visio" : p.placeStr ? `à ${p.placeStr}` : "";
  return `${hi}rappel Madger : séance avec ${p.coachName} ${p.dateStr}${where ? ` ${where}` : ""}. Détails et annulation : ${p.url}`;
}
