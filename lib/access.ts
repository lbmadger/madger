// Code d'accès pré-lancement : verrouille l'app (hors landing) tant qu'il n'est
// pas saisi. Surchargeable via APP_ACCESS_CODE ; valeur par défaut sinon.
// Verrou "vitrine" (les données restent protégées par l'auth + RLS) — il sert
// juste à masquer l'app au public avant le lancement officiel.
export const ACCESS_COOKIE = "madger_access";

export function getAccessCode(): string {
  return process.env.APP_ACCESS_CODE || "madgerleo";
}
