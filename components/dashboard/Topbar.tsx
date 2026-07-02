"use client";

import Link from "next/link";
import MadgerLogo from "@/components/ui/MadgerLogo";
import AccountMenu from "@/components/dashboard/AccountMenu";

// Barre supérieure du dashboard : titre de page, logo centré (mobile) et
// pastille compte. Le choix de langue vit dans Réglages (pas ici).

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
      <h1 className="text-base font-semibold text-text-base">{title}</h1>

      {/* Logo (icône iOS) centré — mobile uniquement */}
      <Link
        href="/dashboard"
        aria-label="Madger"
        className="absolute left-1/2 -translate-x-1/2 sm:hidden"
      >
        <span className="block overflow-hidden rounded-[9px] border border-border-strong">
          <MadgerLogo size={30} />
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <AccountMenu />
      </div>
    </header>
  );
}
