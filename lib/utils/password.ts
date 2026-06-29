// Politique de mot de passe à la création de compte : au moins 8 caractères,
// une majuscule, un chiffre et un caractère spécial. Chaque règle expose une
// clé i18n pour l'afficher dans la checklist en direct du formulaire.

export const PASSWORD_RULES = [
  { key: "len", labelKey: "auth.password.len", test: (p: string) => p.length >= 8 },
  { key: "upper", labelKey: "auth.password.upper", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", labelKey: "auth.password.digit", test: (p: string) => /[0-9]/.test(p) },
  {
    key: "special",
    labelKey: "auth.password.special",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
] as const;

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
