"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Bio écrite par l'IA : ce que le coach a tapé (même en vrac) sert de matière
// première, le résultat remplace le champ et reste retouchable. Le bloc vit à
// côté du champ de bio, partout où on l'édite.
export default function AiBio({
  value,
  onChange,
}: {
  value: string;
  onChange: (bio: string) => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.bio) {
        setError(
          res.status === 503
            ? t("settings.aiBioUnavailable")
            : t("settings.aiBioError")
        );
        return;
      }
      onChange(data.bio as string);
      // Import différé : `track` tire posthog-js (~74 Ko) dans le bundle de
      // la route qui l'importe statiquement. Réglages n'a pas à le payer au
      // premier rendu pour un événement qui ne part qu'après un clic.
      const { track } = await import("@/lib/analytics/posthog");
      track("ai_bio_generated");
    } catch {
      setError(t("settings.aiBioError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-4">
      <p className="text-sm font-semibold text-text-base">
        {t("settings.aiBioTitle")}
      </p>
      <p className="mt-1 text-xs text-text-muted">{t("settings.aiBioHint")}</p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="mt-3 rounded-full border border-accent/40 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-60"
      >
        {loading ? t("settings.aiBioLoading") : t("settings.aiBioCta")}
      </button>
    </div>
  );
}
