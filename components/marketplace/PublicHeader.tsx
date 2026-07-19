"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import MadgerLogo from "@/components/ui/MadgerLogo";

// En-tête léger des pages publiques de la marketplace. Le choix de la langue
// vit dans les réglages, pas ici.
export default function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/coachs" className="flex items-center gap-2.5">
          <MadgerLogo size={28} />
          <span className="text-lg font-extrabold tracking-tight text-text-base">
            Madger
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="hidden rounded-full px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base sm:inline-block"
          >
            Blog
          </Link>
          <Link
            href="/espace"
            className="rounded-full border border-border-strong px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-text-base"
          >
            {t("clientSpace.title")}
          </Link>
        </div>
      </div>
    </header>
  );
}
