"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isNavActive } from "@/lib/ui/nav";
import { useUnreadCount } from "@/lib/messaging/useUnreadCount";

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

  // Dans un fil de discussion, la barre du bas disparaît : le champ de
  // saisie prend sa place et la conversation occupe tout l'écran.
  if (/^\/dashboard\/messages\/./.test(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-bg-elevated/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = isNavActive(pathname, tab.href, tab.href === "/dashboard");
        const className = `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
          tab.soon
            ? "text-text-dim"
            : active
            ? "text-accent"
            : "text-text-muted"
        }`;

        const showBadge = tab.href === "/dashboard/messages" && unread > 0;
        const inner = (
          <>
            <span className="relative">
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
              {showBadge && (
                <span
                  className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black"
                  aria-label={`${unread} ${t("messages.unread")}`}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
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
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={className}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
