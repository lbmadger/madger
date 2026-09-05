"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isNavActive } from "@/lib/ui/nav";
import { useUnreadCount } from "@/lib/messaging/useUnreadCount";

// Barre d'onglets mobile flottante (façon app native) : capsule détachée du
// bord, et une pastille accent qui GLISSE d'un onglet à l'autre au changement
// de page (translation CSS calculée sur des onglets de largeur égale).
// le sidebar prend le relais en desktop avec la même mécanique.

type Tab = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
};

// Dernière position de la pastille, HORS composant : survit aux remontages
// pendant la navigation, l'animation repart toujours du bon onglet.
let lastPillIndex: number | null = null;

const TABS: Tab[] = [
  {
    href: "/dashboard",
    labelKey: "nav.overviewShort",
    icon: <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />,
  },
  {
    href: "/dashboard/clients",
    labelKey: "nav.clients",
    icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 016-6h6a6 6 0 016 6v1" />,
  },
  {
    href: "/dashboard/agenda",
    labelKey: "nav.schedule",
    icon: <path d="M7 3v3m10-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
  },
  {
    href: "/dashboard/prestations",
    labelKey: "nav.services",
    icon: <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-8.1-8.1A2 2 0 012 11.2V4a2 2 0 012-2h7.2a2 2 0 011.4.6l8 8a2 2 0 010 2.8zM7.5 7.5h.01" />,
  },
  {
    href: "/dashboard/messages",
    labelKey: "nav.messages",
    icon: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const unread = useUnreadCount();

  // Optimiste : la pastille part À L'INSTANT du toucher, sans attendre que
  // la nouvelle page soit rendue (sinon elle semble traîner du temps de
  // chargement). L'arrivée de la vraie route confirme ou corrige.
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [pathname]);

  const pillRef = useRef<HTMLSpanElement>(null);
  const routeIndex = TABS.findIndex((tab) =>
    isNavActive(pathname, tab.href, tab.href === "/dashboard")
  );
  const activeIndex = pending ?? routeIndex;

  // Animation PILOTÉE (Web Animations API) plutôt qu'une transition CSS :
  // pendant une navigation, Safari peut avaler l'ancien et le nouveau style
  // dans le même rafraîchissement et la transition ne part jamais (pastille
  // téléportée). animate() tourne sur le compositeur et part explicitement
  // de la dernière position mémorisée, quoi qu'il arrive au DOM.
  useEffect(() => {
    const el = pillRef.current;
    if (!el || activeIndex < 0) return;
    const from = lastPillIndex;
    lastPillIndex = activeIndex;
    if (from === null || from === activeIndex) return;
    el.animate(
      [
        { transform: `translateX(${from * 100}%)` },
        { transform: `translateX(${activeIndex * 100}%)` },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.3, 1.25, 0.4, 1)",
        fill: "forwards",
      }
    );
  }, [activeIndex]);

  // Dans un fil de discussion, la barre du bas disparaît : le champ de
  // saisie prend sa place et la conversation occupe tout l'écran.
  if (/^\/dashboard\/messages\/./.test(pathname)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 md:hidden"
      style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
    >
      {/* Fond opaque, sans backdrop-blur : le flou coûte très cher au GPU
          iOS pendant l'animation de la pastille et faisait saccader la barre. */}
      <nav className="relative flex rounded-[26px] border border-border-strong bg-bg-elevated p-1.5 shadow-[0_10px_36px_rgba(0,0,0,0.6)]">
        {activeIndex >= 0 && (
          <span
            ref={pillRef}
            aria-hidden
            className="absolute bottom-1.5 left-1.5 top-1.5 rounded-[20px] bg-accent"
            style={{
              width: `calc((100% - 12px) / ${TABS.length})`,
              // Position de départ (premier rendu) ; ensuite c'est animate()
              // qui pilote, avec fill forwards.
              transform: `translateX(${activeIndex * 100}%)`,
              // Couche GPU dédiée : la glissade reste fluide même pendant
              // que le fil principal rend la page de destination.
              willChange: "transform",
            }}
          />
        )}
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          const showBadge = tab.href === "/dashboard/messages" && unread > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setPending(i)}
              aria-current={i === routeIndex ? "page" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2"
            >
              <span className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={active ? "text-black" : "text-text-muted"}
                >
                  {tab.icon}
                </svg>
                {showBadge && (
                  <span
                    className={`absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      active ? "bg-black text-accent" : "bg-accent text-black"
                    }`}
                    aria-label={`${unread} ${t("messages.unread")}`}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {/* Graisse CONSTANTE : le passage en gras élargissait le texte
                  en pleine animation (reflow à chaque frame = saccades) et
                  tronquait les libellés justes. Seule la couleur change. */}
              <span
                className={`relative max-w-full truncate text-[10px] font-semibold ${
                  active ? "text-black" : "text-text-muted"
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
