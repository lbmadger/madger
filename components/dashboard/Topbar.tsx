"use client";

import Link from "next/link";
import MadgerLogo from "@/components/ui/MadgerLogo";
import AccountMenu from "@/components/dashboard/AccountMenu";
import { CopyLinkPill, ShareLinkMenu, NotificationBell } from "@/components/dashboard/TopbarActions";
import { dashboardContainer } from "@/lib/ui/styles";

// Barre supérieure du dashboard (comme le mockup de la landing) : titre,
// logo centré (mobile), et à droite : lien de réservation prêt à copier
// (desktop), cloche de notifications, compte (mobile — sur desktop le profil
// vit en bas de la sidebar).

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      {/* Même conteneur que le <main> des pages : titre et cloche sont sur
          l'axe des cartes, quelle que soit la largeur d'écran. */}
      <div className={`${dashboardContainer} relative flex h-16 items-center gap-4`}>
      <h1 className="text-lg font-extrabold tracking-tight text-text-base">{title}</h1>

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

      <div className="ml-auto flex items-center gap-2.5">
        <CopyLinkPill />
        <ShareLinkMenu />
        <NotificationBell />
        {/* Compte : mobile uniquement (desktop → profil en bas de sidebar) */}
        <div className="md:hidden">
          <AccountMenu />
        </div>
      </div>
      </div>
    </header>
  );
}
