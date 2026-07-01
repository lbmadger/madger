// Liste des e-mails admin (résolution des litiges). Définie via la variable
// d'env ADMIN_EMAILS (séparés par des virgules) — jamais en dur dans le code.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
