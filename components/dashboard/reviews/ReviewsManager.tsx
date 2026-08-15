"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import Leo from "@/components/ui/Leo";
import { StarIcon } from "@/components/ui/icons";

// Gestion des avis côté coach, façon Vinted : réponse publique sous l'avis
// (modifiable), signalement d'un avis abusif à l'équipe Madger. Jamais de
// suppression par le coach : c'est ce qui rend les avis crédibles.

export type CoachReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reply: string | null;
  replied_at: string | null;
  hidden: boolean;
  clients: { first_name: string; last_name: string | null } | null;
};

export default function ReviewsManager({
  initialReviews,
}: {
  initialReviews: CoachReview[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [reviews, setReviews] = useState(initialReviews);
  // Réponse en cours d'édition (id de l'avis + brouillon).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Avis signalés pendant cette session (le bouton devient inerte).
  const [reported, setReported] = useState<Set<string>>(new Set());

  async function saveReply(id: string) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const reply = draft.trim().slice(0, 1000) || null;
    const { error: err } = await supabase
      .from("reviews")
      .update({ reply, replied_at: reply ? new Date().toISOString() : null })
      .eq("id", id);
    setSaving(false);
    if (err) {
      setError(t("coachReviews.saveError"));
      return;
    }
    setReviews((rs) =>
      rs.map((r) => (r.id === id ? { ...r, reply } : r))
    );
    setEditingId(null);
    setDraft("");
    router.refresh();
  }

  async function report(id: string) {
    const reason = window.prompt(t("coachReviews.reportPrompt"));
    if (reason === null) return;
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: id, reason: reason.slice(0, 500) }),
      });
      if (!res.ok) throw new Error();
      setReported((s) => new Set(s).add(id));
    } catch {
      setError(t("coachReviews.reportError"));
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
        <Leo pose="ok" size={84} className="mx-auto mb-4" />
        <h3 className="text-base font-semibold text-text-base">
          {t("coachReviews.emptyTitle")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          {t("coachReviews.emptyDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{t("coachReviews.intro")}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => {
          const name =
            [r.clients?.first_name, r.clients?.last_name]
              .filter(Boolean)
              .join(" ") || "-";
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-base">
                  {name}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-text-base">
                  <StarIcon size={14} className="text-accent" />
                  {r.rating}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-text-dim">
                {new Date(r.created_at).toLocaleDateString(loc, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {r.hidden ? ` · ${t("coachReviews.hiddenBadge")}` : ""}
              </p>
              {r.comment && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-muted">
                  {r.comment}
                </p>
              )}

              {/* Réponse publique */}
              {editingId === r.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder={t("coachReviews.replyPlaceholder")}
                    className="w-full resize-none rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-base outline-none placeholder:text-text-dim focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 py-2 text-sm"
                      onClick={() => {
                        setEditingId(null);
                        setDraft("");
                      }}
                    >
                      {t("coachReviews.replyCancel")}
                    </Button>
                    <Button
                      className="flex-1 py-2 text-sm"
                      disabled={saving}
                      onClick={() => saveReply(r.id)}
                    >
                      {saving
                        ? t("coachReviews.replySaving")
                        : t("coachReviews.replySave")}
                    </Button>
                  </div>
                </div>
              ) : r.reply ? (
                <div className="mt-3 rounded-lg border-l-2 border-accent/50 bg-white/[0.03] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                    {t("coachReviews.yourReply")}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-muted">
                    {r.reply}
                  </p>
                </div>
              ) : null}

              {editingId !== r.id && (
                <div className="mt-3 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(r.id);
                      setDraft(r.reply ?? "");
                    }}
                    className="text-xs font-medium text-accent transition-opacity hover:opacity-80"
                  >
                    {r.reply
                      ? t("coachReviews.editReply")
                      : t("coachReviews.reply")}
                  </button>
                  <button
                    type="button"
                    disabled={reported.has(r.id)}
                    onClick={() => report(r.id)}
                    className="text-xs font-medium text-text-dim transition-colors hover:text-danger disabled:opacity-60"
                  >
                    {reported.has(r.id)
                      ? t("coachReviews.reported")
                      : t("coachReviews.report")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
