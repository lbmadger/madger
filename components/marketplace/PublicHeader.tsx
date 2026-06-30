"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, LOCALE_FLAGS, type Locale } from "@/lib/i18n/config";
import MadgerLogo from "@/components/ui/MadgerLogo";

// En-tête léger des pages publiques de la marketplace (logo + langue).
export default function PublicHeader() {
  const { locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/coachs" className="flex items-center gap-2.5">
          <MadgerLogo size={28} />
          <span className="text-lg font-extrabold tracking-tight text-text-base">
            Madger
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              onClick={() => l !== locale && setLocale(l)}
              className={`rounded-md px-2 py-1 text-base leading-none transition-opacity ${
                l === locale ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
              aria-pressed={l === locale}
              aria-label={l}
            >
              {LOCALE_FLAGS[l]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
