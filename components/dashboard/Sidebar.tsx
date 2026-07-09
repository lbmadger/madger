"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import MadgerLogo from "@/components/ui/MadgerLogo";
import SidebarProfile from "@/components/dashboard/SidebarProfile";
import { isNavActive } from "@/lib/ui/nav";

// Élément de navigation. `soon` grise l'entrée et la rend non cliquable tant
// que le module n'existe pas (Phase 0 : seul "Vue d'ensemble" est actif).
type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  soon?: boolean;
};

// Icônes en SVG inline (pas de dépendance) — trait fin, raccord avec l'ADN.
const I = {
  overview: (
    <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
  ),
  clients: (
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 016-6h6a6 6 0 016 6v1" />
  ),
  schedule: (
    <path d="M7 3v3m10-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
  ),
  payments: (
    <path d="M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zm0 4h20M7 15h3" />
  ),
  invoices: (
    <path d="M7 3h10l3 3v15H4V3h3zm0 7h10M7 14h10M7 18h6" />
  ),
  stats: <path d="M4 20V10m6 10V4m6 16v-6m6 6V8" />,
  messages: (
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  ),
  services: (
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-8.1-8.1A2 2 0 012 11.2V4a2 2 0 012-2h7.2a2 2 0 011.4.6l8 8a2 2 0 010 2.8zM7.5 7.5h.01" />
  ),
  settings: (
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM3 12h2m14 0h2M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4" />
  ),
  availability: <path d="M12 7v5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z" />,
  subscription: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  publicPage: (
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z" />
  ),
};

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: I.overview },
  { href: "/dashboard/clients", labelKey: "nav.clients", icon: I.clients },
  { href: "/dashboard/agenda", labelKey: "nav.schedule", icon: I.schedule },
  { href: "/dashboard/prestations", labelKey: "nav.services", icon: I.services },
  { href: "/dashboard/messages", labelKey: "nav.messages", icon: I.messages },
  { href: "/dashboard/paiements", labelKey: "nav.payments", icon: I.payments },
  { href: "/dashboard/factures", labelKey: "nav.invoices", icon: I.invoices },
  { href: "/dashboard/stats", labelKey: "nav.stats", icon: I.stats },
];

const SECONDARY: NavItem[] = [
  { href: "/dashboard/disponibilites", labelKey: "nav.availability", icon: I.availability },

];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const active = isNavActive(pathname, item.href, item.href === "/dashboard");

  const content = (
    <>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        {item.icon}
      </svg>
      <span className="truncate">{t(item.labelKey)}</span>
      {item.soon && (
        <span className="ml-auto rounded-full border border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-dim">
          {t("common.soon")}
        </span>
      )}
    </>
  );

  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";

  if (item.soon) {
    return (
      <div
        className={`${base} cursor-not-allowed text-text-dim`}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${base} ${
        active
          ? "bg-accent/10 text-accent"
          : "text-text-muted hover:bg-bg-elevated hover:text-text-base"
      }`}
    >
      {content}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-elevated p-4 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <MadgerLogo size={30} />
        <span className="text-xl font-extrabold tracking-tight text-text-base">
          Madger
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <div className="my-4 h-px bg-border" />

        {SECONDARY.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Profil coach (photo + nom) en bas — menu vers le haut : abonnement,
          page publique, réglages, déconnexion. Comme le mockup de la landing. */}
      <div className="mt-4 border-t border-border pt-3">
        <SidebarProfile />
      </div>
    </aside>
  );
}
