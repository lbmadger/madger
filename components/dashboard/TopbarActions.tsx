"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/auth/SessionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Actions de la topbar (comme le mockup de la landing) : lien de réservation
// prêt à copier + cloche de notifications (demandes de séance à confirmer).

type PendingItem = {
  id: string;
  starts_at: string;
  clients: { first_name: string; last_name: string | null } | null;
};

export function CopyLinkPill() {
  const { slug } = useSession();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!slug) return null;

  const url = `madger.app/${slug}`;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(`https://${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      title={t("topbar.copyTitle")}
      className="hidden items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.05] py-1.5 pl-3 pr-1.5 transition-colors hover:border-accent/50 lg:flex"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span className="max-w-[180px] truncate text-xs font-semibold text-accent">
        {url}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-black">
        {copied ? (
          `${t("topbar.copied")}`
        ) : (
          <>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {t("topbar.copy")}
          </>
        )}
      </span>
    </button>
  );
}

export function NotificationBell() {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Demandes en attente (à confirmer), rafraîchies toutes les 2 min et en
  // pause quand l'onglet est en arrière-plan (économise la base à l'échelle).
  useEffect(() => {
    let alive = true;
    async function load() {
      if (document.hidden) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("id, starts_at, clients(first_name, last_name)")
        .eq("status", "pending")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(8);
      if (alive && data) setItems(data as unknown as PendingItem[]);
    }
    load();
    const id = setInterval(load, 120_000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Temps réel : une nouvelle demande fait sonner la cloche immédiatement
    // (publication bookings activée par la migration 0031).
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      channel = supabase
        .channel("bell-bookings")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `coach_id=eq.${data.user.id}`,
          },
          () => load()
        )
        .subscribe();
    });

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = items.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("topbar.notifications")}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-text-muted transition-colors hover:border-accent hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-72 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("topbar.notifications")}
          </p>
          {count === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-text-muted">
              {t("topbar.notifEmpty")}
            </p>
          ) : (
            <ul>
              {items.map((b) => (
                <li key={b.id}>
                  <Link
                    href="/dashboard/agenda"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-bg-card"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-base">
                        {[b.clients?.first_name, b.clients?.last_name]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </span>
                      <span className="block text-[11px] capitalize text-text-dim">
                        {new Date(b.starts_at).toLocaleString(loc, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      {t("topbar.toConfirm")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
