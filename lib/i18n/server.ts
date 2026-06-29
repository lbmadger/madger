import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionaries";

// Lit la langue choisie (cookie) côté serveur. À appeler dans le layout du
// dashboard pour résoudre le dictionnaire avant le rendu.
export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
}

export function getServerDictionary() {
  const locale = getLocale();
  return { locale, dict: getDictionary(locale) };
}
