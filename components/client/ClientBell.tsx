"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Cloche de l'espace client : les événements de séance qui le concernent
// (annulation par le coach, demande refusée, séance déplacée, demande
// acceptée). Alimentée côté serveur (table client_notifications, RLS par
// email). Ouvrir le panneau marque tout comme lu. Défensif : si la table
// n'existe pas encore, la cloche reste muette.
type Notif = {
  id: string;
  type: "cancelled" | "declined" | "rescheduled" | "accepted";
  coach_name: string | null;
  starts_at: string | null;
  created_at: string;
  read_at: string | null;
};

export default function ClientBell() {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .from("client_notifications")
      .select("id, type, coach_name, starts_at, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setItems(data as Notif[]);
      });
  }, []);

  // Clic extérieur / Escape : fermeture.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Ouvrir = tout lu (best-effort, l'état local n'attend pas la base).
      const ids = items.filter((n) => !n.read_at).map((n) => n.id);
      setItems((xs) =>
        xs.map((n) =>
          n.read_at ? n : { ...n, read_at: new Date().toISOString() }
        )
      );
      createClient()
        .from("client_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .then(() => {});
    }
  }

  function label(n: Notif): string {
    const base = t(`clientNotifs.types.${n.type}`);
    return n.coach_name ? `${base} · ${n.coach_name}` : base;
  }

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("clientNotifs.title")}
        aria-expanded={open}
        className="relative -mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-bg-card text-text-muted transition-colors hover:border-accent hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 max-w-[85vw] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("clientNotifs.title")}
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-dim">
              {t("clientNotifs.empty")}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-border px-4 py-3 last:border-b-0"
                >
                  <p className="text-sm font-medium text-text-base">
                    {label(n)}
                  </p>
                  {n.starts_at && (
                    <p className="mt-0.5 text-xs text-text-muted first-letter:uppercase">
                      {new Date(n.starts_at).toLocaleString(loc, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-text-dim">
                    {new Date(n.created_at).toLocaleDateString(loc, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
