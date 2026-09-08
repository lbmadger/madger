// Numéros de téléphone des clients, saisis librement (« 06 12 34 56 78 »,
// « +33 6 12 34 56 78 », « 0033612345678 »). Twilio exige le format E.164.
// Cible française par défaut ; un numéro déjà international est conservé.

export function toE164(raw: string | null | undefined, defaultCountry: "FR" = "FR"): string | null {
  if (!raw) return null;
  // « +33 (0)6 12… » : le (0) est un indicatif national à retirer, pas un chiffre.
  let s = String(raw).replace(/\(0\)/g, "").replace(/[\s.\-()]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  }
  if (defaultCountry === "FR") {
    // Fixe ou mobile métropolitain (0X XX XX XX XX) et DROM (0[5-6]9X…).
    if (/^0[1-9]\d{8}$/.test(s)) return `+33${s.slice(1)}`;
  }
  return null;
}

// Seuls les mobiles reçoivent des SMS : en France, 06 et 07 (+336, +337).
export function isFrenchMobile(e164: string | null): boolean {
  return Boolean(e164 && /^\+33[67]\d{8}$/.test(e164));
}
