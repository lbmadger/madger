"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Leo from "@/components/ui/Leo";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Célébration de la toute première réservation du coach : le moment le plus
// émotionnel de sa vie sur Madger mérite mieux qu'une ligne dans un tableau.
// Affichée tant que le coach ne l'a pas fermée (mémorisé en localStorage).
const KEY = "madger_first_booking_seen";

export default function FirstBookingCard({
  clientName,
  dateStr,
}: {
  clientName: string | null;
  dateStr: string | null;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* navigation privée : la carte reviendra, sans gravité */
    }
    setVisible(false);
  };

  return (
    <div className="relative mb-6 flex items-center gap-4 overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 pr-10 sm:p-5 sm:pr-12">
      <Leo pose="ok" size={72} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text-base">
          {t("overview.firstBookingTitle")}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
          {clientName ? `${clientName}${dateStr ? ` · ${dateStr}` : ""}. ` : ""}
          {t("overview.firstBookingDesc")}
        </p>
        <Link
          href="/dashboard/agenda"
          onClick={dismiss}
          className="mt-2.5 inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          {t("overview.firstBookingCta")}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("common.close")}
        className="absolute right-3 top-3 text-text-dim transition-colors hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
