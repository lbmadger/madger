"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/coachs", label: "Coachs" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/litiges", label: "Litiges" },
  { href: "/admin/stripe", label: "Stripe" },
  { href: "/admin/emails", label: "Emails test" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-accent text-text-base"
                : "border-transparent text-text-muted hover:text-text-base"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
