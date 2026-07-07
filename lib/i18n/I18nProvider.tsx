"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Dictionary } from "./dictionaries";
import { LOCALE_COOKIE, type Locale } from "./config";

// Contexte i18n du dashboard. Le dictionnaire est résolu côté serveur (dans
// le layout) et injecté ici, donc aucun coût réseau côté client et pas de
// flash de texte non traduit.

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  // <html lang> est rendu statiquement en "fr" (le layout racine ne lit pas
  // les cookies pour rester cacheable) : on aligne l'attribut sur la locale
  // réelle pour que les lecteurs d'écran vocalisent l'UI anglaise en anglais.
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return (
    <I18nContext.Provider value={{ locale, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

// Résout une clé pointée ("nav.clients") dans le dictionnaire courant.
// Renvoie la clé brute si elle n'existe pas (utile pour repérer les oublis).
function resolve(dict: Dictionary, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      dict
    );
  return typeof value === "string" ? value : path;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n doit être utilisé dans un <I18nProvider>.");
  }

  const { locale, dict } = ctx;

  const t = useCallback((path: string) => resolve(dict, path), [dict]);
  // `dict` exposé pour lire les valeurs non-string (ex: listes de features).

  // Changement de langue : on pose le cookie puis on recharge pour que le
  // serveur re-rende avec le bon dictionnaire (Server Components inclus).
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    window.location.reload();
  }, []);

  return { t, locale, setLocale, dict };
}
