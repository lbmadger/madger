"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, LOCALE_FLAGS, type Locale } from "@/lib/i18n/config";

// Nom de chaque langue, écrit dans sa propre langue (convention UX).
const NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

// Sélecteur de langue (drapeaux + nom), affiché dans Réglages. Pose le cookie
// et recharge la page (cf. useI18n.setLocale).
export default function LanguagePicker() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => !active && setLocale(l)}
            aria-pressed={active}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-strong text-text-muted hover:text-text-base"
            }`}
          >
            <span className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
            {NAMES[l]}
          </button>
        );
      })}
    </div>
  );
}
