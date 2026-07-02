"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/lib/auth/SessionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Bloc profil en bas de la sidebar (comme le mockup de la landing) : photo,
// nom, plan. Au clic, menu vers le haut : Abonnement (badge), Ma page
// publique, Réglages, Déconnexion.
export default function SidebarProfile() {
  const { email, name, avatarUrl, slug, pro } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const displayName = name || email;
  const initial = (name || email).charAt(0).toUpperCase();

  const itemCls =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-card hover:text-text-base";

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
          <Link
            href="/dashboard/abonnement"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
            <span className="flex-1">{t("nav.subscription")}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                pro
                  ? "bg-accent text-black"
                  : "border border-border-strong text-text-dim"
              }`}
            >
              {pro ? t("plans.pro") : t("plans.free")}
            </span>
          </Link>

          {slug && (
            <Link
              href={`/${slug}`}
              target="_blank"
              onClick={() => setOpen(false)}
              className={itemCls}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
              {t("nav.publicPage")}
            </Link>
          )}

          <Link
            href="/dashboard/reglages"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 00-1.7-1l-.4-2.5h-4l-.4 2.5a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7.5 7.5 0 000 2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 001.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 001.7-1l2.4 1 2-3.5z" />
            </svg>
            {t("nav.settings")}
          </Link>

          <form action="/auth/signout" method="post" className="border-t border-border">
            <button type="submit" className={`${itemCls} hover:text-red-400`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {t("account.signout")}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          open
            ? "border-accent/40 bg-bg-card"
            : "border-transparent hover:border-border-strong hover:bg-bg-card"
        }`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full border border-border-strong object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
            {initial}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-base">
            {displayName}
          </span>
          <span className="block text-[11px] text-text-dim">
            {pro ? `${t("plans.pro")} ⚡` : t("plans.free")}
          </span>
        </span>
        {/* Pastille "en ligne" comme le mockup */}
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
      </button>
    </div>
  );
}
