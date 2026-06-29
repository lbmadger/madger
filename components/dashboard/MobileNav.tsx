"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Barre d'onglets mobile, fixée en bas de l'écran (façon app native).
// Visible < md uniquement ; le sidebar prend le relais en desktop. On y met
// les entrées principales pour garder le pouce à portée. Les modules "soon"
// sont grisés mais visibles pour montrer la trajectoire produit.

type Tab = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  soon?: boolean;
};

const TABS: Tab[] = [
  {
    href: "/dashboard",
    labelKey: "nav.overview",
    icon: <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />,
  },
  {
    href: "/dashboard/clients",
    labelKey: "nav.clients",
    soon: true,
    icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 016-6h6a6 6 0 016 6v1" />,
  },
  {
    href: "/dashboard/agenda",
    labelKey: "nav.schedule",
    soon: true,
    icon: <path d="M7 3v3m10-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
  },
  {
    href: "/dashboard/paiements",
    labelKey: "nav.payments",
    soon: true,
    icon: <path d="M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zm0 4h20M7 15h3" />,
  },
  {
    href: "/dashboard/stats",
    labelKey: "nav.stats",
    soon: true,
    icon: <path d="M4 20V10m6 10V4m6 16v-6m6 6V8" />,
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-bg-elevated/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const className = `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
          tab.soon
            ? "text-text-dim"
            : active
            ? "text-accent"
            : "text-text-muted"
        }`;

        const inner = (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            <span className="truncate">{t(tab.labelKey)}</span>
          </>
        );

        if (tab.soon) {
          return (
            <div key={tab.href} className={className} aria-disabled="true">
              {inner}
            </div>
          );
        }

        return (
          <Link key={tab.href} href={tab.href} className={className}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
