"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Carte parrainage : le coach partage son lien ; quand un filleul passe Pro,
// les deux gagnent 1 mois de Pro. Affiche le lien (copie en un clic) et les
// compteurs (filleuls inscrits, récompenses obtenues).
export default function ReferralCard({
  link,
  referred,
  rewarded,
}: {
  link: string;
  referred: number;
  rewarded: number;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4" />
          </svg>
        </span>
        <div>
          <h3 className="text-base font-semibold text-text-base">
            {t("referral.title")}
          </h3>
          <p className="text-xs text-text-muted">{t("referral.subtitle")}</p>
        </div>
      </div>

      {/* Lien à partager */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-strong bg-bg-elevated p-2">
        <span className="min-w-0 flex-1 truncate px-2 text-sm text-text-muted">
          {link}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          {copied ? t("referral.copied") : t("referral.copy")}
        </button>
      </div>

      {/* Compteurs */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg-elevated p-3 text-center">
          <p className="text-2xl font-extrabold text-text-base">{referred}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("referral.referredLabel")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-3 text-center">
          <p className="text-2xl font-extrabold text-accent">{rewarded}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("referral.monthsLabel")}
          </p>
        </div>
      </div>
    </section>
  );
}
