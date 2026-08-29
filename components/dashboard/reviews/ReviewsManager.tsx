"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import Leo from "@/components/ui/Leo";
import { StarIcon } from "@/components/ui/icons";

// Gestion des avis côté coach, façon Vinted : réponse sous l'avis
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

// Rangée d'étoiles pleines/éteintes : plus parlant qu'un chiffre nu.
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          size={size}
          className={i < rating ? "text-accent" : "text-white/15"}
        />
      ))}
    </span>
  );
}

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
  // Signalement : mini-formulaire inline (plus de window.prompt système).
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState("");
  const [reporting, setReporting] = useState(false);
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
    setReviews((rs) => rs.map((r) => (r.id === id ? { ...r, reply } : r)));
    setEditingId(null);
    setDraft("");
    router.refresh();
  }

  async function sendReport(id: string) {
    setReporting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: id,
          reason: reportDraft.trim().slice(0, 500),
        }),
      });
      if (!res.ok) throw new Error();
      setReported((s) => new Set(s).add(id));
      setReportingId(null);
      setReportDraft("");
    } catch {
      setError(t("coachReviews.reportError"));
    } finally {
      setReporting(false);
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

  // Résumé : moyenne sur les avis visibles (les masqués ne comptent pas).
  const visible = reviews.filter((r) => !r.hidden);
  const avg =
    visible.length > 0
      ? Math.round(
          (visible.reduce((s, r) => s + r.rating, 0) / visible.length) * 10
        ) / 10
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau résumé : la note en grand, le contexte en petit. */}
      <section className="flex items-center gap-5 rounded-2xl border border-border bg-bg-card p-5">
        <div className="flex flex-col items-center">
          <span className="font-display text-4xl font-extrabold tracking-tight text-text-base">
            {avg !== null ? avg.toLocaleString(loc) : "–"}
          </span>
          <Stars rating={Math.round(avg ?? 0)} size={13} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-base">
            {visible.length}{" "}
            {visible.length > 1
              ? t("coachReviews.countMany")
              : t("coachReviews.countOne")}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-dim">
            {t("coachReviews.intro")}
          </p>
        </div>
      </section>

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
          const initial = (r.clients?.first_name?.[0] ?? "?").toUpperCase();
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5"
            >
              {/* En-tête : avatar initiale + nom + date, étoiles à droite */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-base">
                      {name}
                    </p>
                    <p className="text-[11px] text-text-dim">
                      {new Date(r.created_at).toLocaleDateString(loc, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {r.hidden && (
                        <span className="ml-1.5 rounded-full border border-warning/40 px-1.5 py-px text-[10px] font-medium text-warning">
                          {t("coachReviews.hiddenBadge")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>

              {r.comment && (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-muted">
                  {r.comment}
                </p>
              )}

              {/* Réponse du coach : bulle imbriquée, comme sur la page publique */}
              {editingId === r.id ? (
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {t("coachReviews.yourReply")}
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-text-dim">
                      · {t("coachReviews.replyHint")}
                    </span>
                  </p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    placeholder={t("coachReviews.replyPlaceholder")}
                    className="w-full resize-none rounded-xl border border-border-strong bg-bg px-3.5 py-2.5 text-sm text-text-base outline-none placeholder:text-text-dim focus:border-accent"
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
                <div className="ml-4 mt-3 rounded-xl rounded-tl-sm border border-border bg-bg-elevated px-3.5 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {t("coachReviews.yourReply")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-muted">
                    {r.reply}
                  </p>
                </div>
              ) : null}

              {/* Signalement : mini-formulaire inline */}
              {reportingId === r.id && (
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-danger/25 bg-danger/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-danger">
                    {t("coachReviews.reportTitle")}
                  </p>
                  <textarea
                    value={reportDraft}
                    onChange={(e) => setReportDraft(e.target.value)}
                    rows={2}
                    maxLength={500}
                    autoFocus
                    placeholder={t("coachReviews.reportPlaceholder")}
                    className="w-full resize-none rounded-xl border border-border-strong bg-bg px-3.5 py-2.5 text-sm text-text-base outline-none placeholder:text-text-dim focus:border-danger/60"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 py-2 text-sm"
                      onClick={() => {
                        setReportingId(null);
                        setReportDraft("");
                      }}
                    >
                      {t("coachReviews.replyCancel")}
                    </Button>
                    <button
                      type="button"
                      disabled={reporting || reportDraft.trim().length === 0}
                      onClick={() => sendReport(r.id)}
                      className="flex-1 rounded-full bg-danger py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {t("coachReviews.reportSend")}
                    </button>
                  </div>
                </div>
              )}

              {editingId !== r.id && reportingId !== r.id && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(r.id);
                      setDraft(r.reply ?? "");
                    }}
                    className="rounded-full border border-border-strong px-3.5 py-1.5 text-xs font-semibold text-text-base transition-colors hover:border-accent hover:text-accent"
                  >
                    {r.reply
                      ? t("coachReviews.editReply")
                      : t("coachReviews.reply")}
                  </button>
                  {reported.has(r.id) ? (
                    <span className="px-2 text-xs text-text-dim">
                      {t("coachReviews.reported")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReportingId(r.id)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-text-dim transition-colors hover:text-danger"
                    >
                      {t("coachReviews.report")}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
