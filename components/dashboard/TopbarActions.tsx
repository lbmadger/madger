"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// Demande de remboursement du reste d'un pack (le coach a 7 jours pour
// répondre depuis la fiche client).
type RefundItem = {
  id: string;
  client_id: string;
  refund_requested_at: string | null;
  total: number;
  used: number;
  clients: { first_name: string; last_name: string | null } | null;
};

export function CopyLinkPill() {
  const { slug } = useSession();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!slug) return null;

  const url = `madger.app/${slug}`;
  const copy = () => {
    navigator.clipboard.writeText(`https://${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
      type="button"
      onClick={copy}
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
      {/* role="status" : le passage à « Copié » est annoncé aux lecteurs d'écran. */}
      <span role="status" className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">
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
    </>
  );
}

// Événement global : la checklist de mise en route (« Envoie ton lien à un
// premier client ») ouvre ce menu sans câblage de contexte.
export const SHARE_OPEN_EVENT = "madger:share-open";

// Menu « Partager » à côté de « Copier » : WhatsApp (message pré-écrit),
// copie pour la bio Instagram, SMS. Sur mobile, navigator.share en premier.
export function ShareLinkMenu() {
  const { slug } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copiedBio, setCopiedBio] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const link = slug ? `https://madger.app/${slug}` : "";
  const message = t("topbar.shareMessage").replace("{link}", link);

  // Un seul geste : le bouton ouvre NOTRE menu (tiroir en bas sur mobile,
  // menu déroulant sur desktop). La feuille de partage native n'est plus
  // ouverte d'office : elle est proposée en dernier choix (« Plus
  // d'options »), et son annulation ne rouvre rien.
  const openMenu = () => {
    if (!link) return;
    setOpen((v) => !v);
  };
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const nativeShare = async () => {
    setOpen(false);
    try {
      await navigator.share({ text: message, url: link });
    } catch {
      /* annulé par le coach : rien à faire */
    }
  };
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || sheetRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const onOpenEvent = () => {
      setOpen(true);
      ref.current?.scrollIntoView({ block: "nearest" });
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener(SHARE_OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(SHARE_OPEN_EVENT, onOpenEvent);
    };
  }, []);

  if (!slug) return null;

  const copyBio = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedBio(true);
      setTimeout(() => setCopiedBio(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  const itemClass =
    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-base transition-colors hover:bg-bg-card lg:py-2.5";
  const iconWrap = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent";

  const menuBody = (
    <>
      <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-dim">
        {t("topbar.shareTitle")}
      </p>
      <button role="menuitem" type="button" onClick={copyBio} className={itemClass}>
        <span className={iconWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{copiedBio ? t("topbar.copied") : t("topbar.shareCopy")}</span>
          <span className="block truncate text-[11px] text-text-dim">{link.replace("https://", "")}</span>
        </span>
      </button>
      <a
        role="menuitem"
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setOpen(false)}
        className={itemClass}
      >
        <span className={iconWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 21l2.3-5.2A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        </span>
        <span>
          <span className="block font-medium">{t("topbar.shareWhatsapp")}</span>
          <span className="block text-[11px] text-text-dim">{t("topbar.shareWhatsappDesc")}</span>
        </span>
      </a>
      <a
        role="menuitem"
        href={`sms:?&body=${encodeURIComponent(message)}`}
        onClick={() => setOpen(false)}
        className={itemClass}
      >
        <span className={iconWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span>
          <span className="block font-medium">{t("topbar.shareSms")}</span>
          <span className="block text-[11px] text-text-dim">{t("topbar.shareSmsDesc")}</span>
        </span>
      </a>
      {canNativeShare && (
        <button role="menuitem" type="button" onClick={nativeShare} className={itemClass}>
          <span className={iconWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </span>
          <span>
            <span className="block font-medium">{t("topbar.shareMore")}</span>
            <span className="block text-[11px] text-text-dim">{t("topbar.shareMoreDesc")}</span>
          </span>
        </button>
      )}
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openMenu}
        aria-label={t("topbar.share")}
        title={t("topbar.share")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border transition-colors lg:rounded-full lg:border-border-strong lg:bg-white/[0.03] lg:px-3.5 lg:text-text-muted lg:hover:border-accent lg:hover:text-text-base ${
          open ? "w-9 border-accent bg-accent text-black" : "w-9 border-accent/40 bg-accent/[0.05] text-accent"
        } lg:w-auto`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="hidden text-xs font-semibold lg:inline">{t("topbar.share")}</span>
      </button>

      {open && (
        <>
          {/* Desktop : menu déroulant sous le bouton */}
          <div
            role="menu"
            className="absolute right-0 top-11 z-30 hidden w-72 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl lg:block"
          >
            {menuBody}
          </div>
          {/* Mobile : tiroir en bas de l'écran, hors du header (backdrop-blur
              y piégerait un élément fixed). */}
          {typeof document !== "undefined" &&
            createPortal(
              <div className="lg:hidden">
                <div className="fixed inset-0 z-40 bg-black/60" aria-hidden onClick={() => setOpen(false)} />
                <div
                  ref={sheetRef}
                  role="menu"
                  className="anim-menu-in fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-2xl border-t border-border bg-bg-elevated pb-[max(env(safe-area-inset-bottom),12px)] shadow-2xl"
                >
                  <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" aria-hidden />
                  {menuBody}
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Demandes en attente (séances à confirmer, remboursements de pack à
  // traiter), rafraîchies toutes les 2 min et en pause quand l'onglet est en
  // arrière-plan (économise la base à l'échelle).
  useEffect(() => {
    let alive = true;
    async function load() {
      if (document.hidden) return;
      const supabase = createClient();
      const [{ data }, { data: packs }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, starts_at, clients(first_name, last_name)")
          .eq("status", "pending")
          .gte("ends_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(8),
        supabase
          .from("pack_credits")
          .select("id, client_id, refund_requested_at, total, used, clients(first_name, last_name)")
          .eq("refund_request_status", "pending")
          .eq("status", "active")
          .order("refund_requested_at", { ascending: true })
          .limit(8),
      ]);
      if (!alive) return;
      if (data) setItems(data as unknown as PendingItem[]);
      if (packs) setRefunds(packs as unknown as RefundItem[]);
    }
    load();
    const id = setInterval(load, 120_000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Temps réel : une nouvelle demande fait sonner la cloche immédiatement
    // (publications bookings et pack_credits, migrations 0031 et 0075).
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pack_credits",
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const count = items.length + refunds.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("topbar.notifications")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-text-muted transition-colors hover:border-accent hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-black">
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
              {refunds.map((p) => {
                const remaining = Math.max(0, p.total - p.used);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/clients/${p.client_id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-bg-card"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-base">
                          {[p.clients?.first_name, p.clients?.last_name]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </span>
                        <span className="block text-[11px] text-text-dim">
                          {t(remaining > 1 ? "topbar.refundLinePlural" : "topbar.refundLine").replace(
                            "{n}",
                            String(remaining)
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        {t("topbar.refund")}
                      </span>
                    </Link>
                  </li>
                );
              })}
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
