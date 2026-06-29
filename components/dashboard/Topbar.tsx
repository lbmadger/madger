"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import AccountMenu from "@/components/dashboard/AccountMenu";

// Barre supérieure du dashboard : titre de page + sélecteur de langue et
// pastille compte. Le sélecteur pose un cookie et recharge (cf. useI18n).

export default function Topbar({ title }: { title: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-bg/80 px-6 backdrop-blur">
      <h1 className="text-base font-semibold text-text-base">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        {/* Sélecteur de langue FR / EN */}
        <div className="flex items-center rounded-lg border border-border p-0.5">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              onClick={() => l !== locale && setLocale(l)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                l === locale
                  ? "bg-accent text-black"
                  : "text-text-muted hover:text-text-base"
              }`}
              aria-pressed={l === locale}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Menu compte (email + déconnexion) */}
        <AccountMenu />
      </div>
    </header>
  );
}
