"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Bouton « Partager en story » : génère la carte 1080x1920 côté serveur
// (/api/story) puis ouvre la feuille de partage native (Instagram, WhatsApp…)
// via l'API Web Share. Sans support (desktop), l'image se télécharge : on la
// glisse dans une story manuellement.
export default function ShareStoryButton({
  type,
  reviewId,
  label,
  className = "",
}: {
  type: "rating" | "sessions" | "review" | "fact";
  reviewId?: string;
  label: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function share() {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ type });
      if (reviewId) params.set("review_id", reviewId);
      const res = await fetch(`/api/story?${params.toString()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], "story-madger.png", { type: "image/png" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file] });
        } catch {
          /* partage annulé par l'utilisateur : pas une erreur */
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "story-madger.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.06] px-3.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/10 disabled:opacity-60 ${className}`}
      title={error ? t("story.error") : undefined}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {loading ? t("story.preparing") : error ? t("story.error") : label}
    </button>
  );
}
