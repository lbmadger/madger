import { createHmac, timingSafeEqual } from "crypto";

// ─────────────────────────────────────────────────────────────────────────
// Jeton d'avis (anti-usurpation).
//
// Un avis n'est déposable que par le CLIENT de la séance. Auparavant l'API ne
// vérifiait que « email + booking_id » — deux valeurs qu'un coach possède déjà
// pour ses propres clients : il pouvait donc fabriquer des avis 5★ sur son
// profil. On exige désormais un jeton signé (HMAC), calculé côté serveur et
// glissé UNIQUEMENT dans le lien de réservation envoyé par email au client
// (jamais rendu sur la page publique, jamais envoyé au coach). Le coach ne
// connaît pas le secret : il ne peut donc pas forger le jeton.
//
// Le jeton est déterministe (fonction de booking_id) : le même lien reste
// valable dans tous les emails d'une réservation, sans stockage en base.
// ─────────────────────────────────────────────────────────────────────────

function secret(): string {
  // Secret dédié si présent, sinon repli sur la clé service role (déjà secrète
  // et disponible partout où ces liens sont générés côté serveur).
  return (
    process.env.REVIEW_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

// Signature courte, URL-safe, tronquée à 24 caractères (largement suffisant
// contre le brute-force : l'espace reste > 2^140).
export function reviewToken(bookingId: string): string {
  const key = secret();
  if (!key) return "";
  return createHmac("sha256", key)
    .update(`review:${bookingId}`)
    .digest("base64url")
    .slice(0, 24);
}

// Comparaison à temps constant.
export function verifyReviewToken(
  bookingId: string,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  const expected = reviewToken(bookingId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Lien de réservation avec jeton d'avis, à n'insérer que dans les emails
// destinés au client.
export function reviewLink(appUrl: string, bookingId: string): string {
  const token = reviewToken(bookingId);
  const base = `${appUrl}/reservation/${bookingId}`;
  return token ? `${base}?r=${token}` : base;
}
