// Envoi d'emails transactionnels via Resend. La clé vit uniquement côté serveur
// (RESEND_API_KEY). Renvoie false au lieu de planter si non configurée, pour ne
// jamais bloquer un paiement / une réservation à cause de l'email.
const FROM = "Madger <contact@madger.app>";

// Resend limite à 2 requêtes par seconde : les envois d'un même processus
// (cron de versement, rappels) sont espacés d'au moins 550 ms. Un appel
// bloqué (réseau) est abandonné au bout de 10 s pour ne jamais retenir un
// paiement ou un cron.
const MIN_GAP_MS = 550;
const TIMEOUT_MS = 10_000;
let lastSentAt = 0;
let queue: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const slot = queue.then(async () => {
    const wait = lastSentAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSentAt = Date.now();
  });
  queue = slot.catch(() => undefined);
  return slot;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  // Pièces jointes (facture PDF…) : contenu encodé en base64.
  attachments?: { filename: string; content: string }[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return false;
  try {
    await throttle();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      }),
    });
    if (!res.ok) {
      // Trace serveur (logs Vercel) : quota Resend épuisé, adresse rejetée…
      console.error(
        "sendEmail failed:",
        res.status,
        (await res.text().catch(() => "")).slice(0, 300)
      );
    }
    return res.ok;
  } catch (e) {
    console.error("sendEmail error:", e instanceof Error ? e.message : e);
    return false;
  }
}
