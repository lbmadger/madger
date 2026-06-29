// Configuration i18n du dashboard, volontairement auto-contenue : pas de
// middleware global ni de segment [locale], pour ne RIEN changer au routage
// de la landing (qui reste 100 % FR sur "/"). La langue est mémorisée dans
// un cookie et appliquée uniquement sous /dashboard.

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

// Nom du cookie qui mémorise la langue choisie par le coach.
export const LOCALE_COOKIE = "madger_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}
