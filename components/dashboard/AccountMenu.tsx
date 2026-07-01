"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/SessionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Pastille compte + menu déroulant (email, raccourcis mobiles, déconnexion).
// La déconnexion passe par un POST vers /auth/signout (route serveur).

export default function AccountMenu() {
  const { email, slug } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = email.charAt(0).toUpperCase();

  // Ferme le menu au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg-card text-sm font-semibold text-text-base transition-colors hover:border-accent"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-text-base">
              {email}
            </p>
          </div>
          {/* Raccourcis visibles surtout sur mobile (sidebar masquée) */}
          <div className="md:hidden">
            <Link
              href="/dashboard/abonnement"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-card hover:text-text-base"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
              {t("nav.subscription")}
            </Link>
            <Link
              href="/dashboard/reglages"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-card hover:text-text-base"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 00-1.7-1l-.4-2.5h-4l-.4 2.5a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7.5 7.5 0 000 2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 001.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 001.7-1l2.4 1 2-3.5z" />
              </svg>
              {t("nav.settings")}
            </Link>
            {slug && (
              <Link
                href={`/${slug}`}
                target="_blank"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-card hover:text-text-base"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
                {t("nav.publicPage")}
              </Link>
            )}
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-card hover:text-text-base"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {t("account.signout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
