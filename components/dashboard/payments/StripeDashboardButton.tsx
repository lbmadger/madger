"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Ouvre le tableau de bord Stripe du coach (virements, IBAN, justificatifs).
// Le lien est créé à la demande côté serveur : il est à usage unique.
export default function StripeDashboardButton() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function go() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/stripe/dashboard", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-text-base transition-colors hover:border-accent disabled:opacity-60"
      >
        {loading ? t("payments.opening") : t("payments.openStripe")}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
        </svg>
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {t("payments.connectError")}
        </p>
      )}
    </div>
  );
}
