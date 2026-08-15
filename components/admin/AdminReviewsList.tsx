"use client";

import { useState } from "react";
import { StarIcon } from "@/components/ui/icons";

// Liste de modération des avis : bascule masquer/réafficher par avis.

export type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reply: string | null;
  hidden: boolean;
  coaches: { first_name: string; last_name: string | null; slug: string | null } | null;
  clients: { first_name: string; last_name: string | null } | null;
};

export default function AdminReviewsList({
  initialReviews,
}: {
  initialReviews: AdminReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string, hidden: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: id, hidden }),
      });
      if (!res.ok) throw new Error();
      setReviews((rs) =>
        rs.map((r) => (r.id === id ? { ...r, hidden } : r))
      );
    } catch {
      setError("La bascule a échoué. Réessaie.");
    }
    setBusyId(null);
  }

  if (reviews.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-border bg-bg-card p-6 text-sm text-text-muted">
        Aucun avis pour l&apos;instant.
      </p>
    );
  }

  const name = (p: { first_name: string; last_name: string | null } | null) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "-";

  return (
    <div className="mt-5">
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border p-4 ${
              r.hidden
                ? "border-danger/30 bg-danger/[0.04]"
                : "border-border bg-bg-card"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-text-base">
                <span className="font-semibold">{name(r.clients)}</span>
                <span className="text-text-dim"> → coach </span>
                <span className="font-semibold">{name(r.coaches)}</span>
              </p>
              <span className="flex items-center gap-1 text-sm font-bold">
                <StarIcon size={14} className="text-accent" />
                {r.rating}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-text-dim">
              {new Date(r.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {r.hidden ? " · MASQUÉ" : ""}
            </p>
            {r.comment && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-muted">
                {r.comment}
              </p>
            )}
            {r.reply && (
              <p className="mt-1.5 whitespace-pre-wrap break-words border-l-2 border-accent/40 pl-2 text-xs text-text-dim">
                Réponse du coach : {r.reply}
              </p>
            )}
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => toggle(r.id, !r.hidden)}
              className={`mt-3 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                r.hidden
                  ? "border-accent/40 text-accent hover:border-accent"
                  : "border-danger/40 text-danger hover:border-danger"
              }`}
            >
              {busyId === r.id
                ? "…"
                : r.hidden
                ? "Réafficher l'avis"
                : "Masquer l'avis"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
