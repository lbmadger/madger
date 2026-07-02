"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Formulaire d'avis après la séance (page de réservation). 1 client = 1 avis
// par coach : re-noter remplace l'avis précédent (géré côté API/BDD).
export default function ReviewForm({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) return setError(t("reviews.errors.ratingRequired"));
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, email, rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        return;
      }
      if (data.error === "email_mismatch")
        setError(t("reviews.errors.emailMismatch"));
      else if (data.error === "too_early")
        setError(t("reviews.errors.tooEarly"));
      else if (data.error === "not_eligible")
        setError(t("reviews.errors.notEligible"));
      else setError(t("reviews.errors.generic"));
    } catch {
      setError(t("reviews.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-accent/20 bg-accent/[0.05] p-4 text-sm text-text-base">
        {t("reviews.thanks")}
      </p>
    );
  }

  const active = hover || rating;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-text-base">
          {t("reviews.leaveTitle")}
        </p>
        <p className="mt-0.5 text-xs text-text-dim">{t("reviews.oneNote")}</p>
      </div>

      {/* Sélecteur d'étoiles */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${i + 1}/5`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={active > i ? "#CBFF03" : "rgba(255,255,255,0.15)"}
              />
            </svg>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t("reviews.commentLabel")}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t("reviews.commentPlaceholder")}
          className={`${inputClass} resize-none`}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t("reviews.emailLabel")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={loading} className="self-start">
        {loading ? t("reviews.sending") : t("reviews.submit")}
      </Button>
    </form>
  );
}
