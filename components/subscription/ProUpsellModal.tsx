"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/SessionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@/components/ui/Dialog";
import {
  launchOfferActive,
  launchOfferDaysLeft,
} from "@/lib/subscription/offer";
import LaunchPrice from "@/components/subscription/LaunchPrice";

const STORAGE_KEY = "madger_pro_modal_until";
const SNOOZE_DAYS = 7;
const OPEN_DELAY_MS = 2500;

// Fenêtre Pro pour les coachs en Gratuit : au milieu de l'écran, fermable
// d'une croix, revient au plus tôt 7 jours plus tard. Jamais sur la page
// Abonnement (le coach y est déjà) ni pendant l'onboarding.
export default function ProUpsellModal() {
  const { pro } = useSession();
  const { t, dict, locale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pro) return;
    if (!pathname || pathname.startsWith("/dashboard/abonnement")) return;
    let until = 0;
    try {
      until = Number(localStorage.getItem(STORAGE_KEY) || 0);
    } catch {
      /* stockage indisponible : on affiche */
    }
    if (until > Date.now()) return;
    const id = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pro, pathname]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(Date.now() + SNOOZE_DAYS * 86400000)
      );
    } catch {
      /* best-effort */
    }
  }

  if (!open) return null;
  const offer = launchOfferActive();
  const daysLeft = launchOfferDaysLeft();

  return (
    <Dialog
      onClose={close}
      label={t("plans.modalTitle")}
      className="relative w-full max-w-md rounded-t-3xl border border-accent/30 bg-bg-card p-6 sm:rounded-3xl"
    >
      <button
        type="button"
        onClick={close}
        aria-label={t("common.close")}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/5 hover:text-text-base"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {offer && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("plans.offerBadge")}
        </span>
      )}
      <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-text-base">
        {t("plans.modalTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {t("plans.modalBody")}
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-bg-elevated p-4">
        <LaunchPrice
          locale={locale}
          suffix={t("plans.perMonth")}
          fromLabel={t("plans.offerFrom")}
        />
        {offer ? (
          <p className="mt-2 text-xs font-semibold text-accent">
            {daysLeft <= 1
              ? t("plans.offerLastDay")
              : t("plans.offerDaysLeft").replace("{n}", String(daysLeft))}
            <span className="block font-normal text-text-muted">{t("plans.offerLocked")}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-muted">{t("plans.proNote")}</p>
        )}
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text-base">
          {dict.plans.modalPoints.map((pt) => (
            <li key={pt} className="flex items-start gap-2">
              <svg className="mt-0.5 shrink-0 text-accent" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/dashboard/abonnement"
        onClick={close}
        className="mt-4 block w-full rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        {t("plans.modalCta")}
      </Link>
      <button
        type="button"
        onClick={close}
        className="mt-2 w-full py-2 text-center text-xs text-text-dim hover:text-text-muted"
      >
        {t("plans.modalLater")}
      </button>
    </Dialog>
  );
}
