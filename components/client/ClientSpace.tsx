"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import {
  refundFraction,
  type CancellationPolicy,
} from "@/lib/booking/cancellation";

export type ClientBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  location: string;
  coach_name: string;
  coach_slug: string | null;
  cancellation_policy: CancellationPolicy;
  escrow_status: string | null;
  amount_cents: number | null;
};

// Espace client : séances à venir (annulables selon la formule du coach,
// remboursement estimé affiché AVANT confirmation) et séances passées (lien
// pour noter). Raccourcis profil / messages / recherche de coach.
export default function ClientSpace({
  bookings,
}: {
  bookings: ClientBooking[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = Date.now();
  const upcoming = bookings
    .filter(
      (b) => new Date(b.ends_at).getTime() >= now && b.status !== "cancelled"
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = bookings.filter(
    (b) => new Date(b.ends_at).getTime() < now || b.status === "cancelled"
  );

  function dateStr(iso: string): string {
    return new Date(iso).toLocaleString(loc, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // % remboursé si annulation MAINTENANT (formule du coach).
  function refundPct(b: ClientBooking): number {
    return Math.round(
      refundFraction(b.cancellation_policy, new Date(b.starts_at)) * 100
    );
  }

  async function cancel(id: string) {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/client-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id }),
      });
      if (!res.ok) {
        setError(t("clientSpace.cancelError"));
        return;
      }
      setCancelId(null);
      router.refresh();
    } catch {
      setError(t("clientSpace.cancelError"));
    } finally {
      setCancelling(false);
    }
  }

  const statusChip: Record<string, { label: string; cls: string }> = {
    pending: {
      label: t("clientSpace.statusPending"),
      cls: "bg-yellow-400/10 text-yellow-400",
    },
    confirmed: {
      label: t("clientSpace.statusConfirmed"),
      cls: "bg-accent/10 text-accent",
    },
    completed: {
      label: t("clientSpace.statusCompleted"),
      cls: "border border-border-strong text-text-muted",
    },
    cancelled: {
      label: t("clientSpace.statusCancelled"),
      cls: "bg-red-500/10 text-red-400",
    },
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base sm:text-3xl">
        {t("clientSpace.title")}
      </h1>

      {/* Raccourcis */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/coachs"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          {t("clientSpace.findCoach")}
        </Link>
        <Link
          href="/messages"
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {t("clientSpace.messages")}
        </Link>
        <Link
          href="/onboarding-client"
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {t("clientSpace.myProfile")}
        </Link>
      </div>

      {/* À venir */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
        {t("clientSpace.upcoming")}
      </h2>
      {upcoming.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-bg-card p-6 text-center text-sm text-text-muted">
          {t("clientSpace.noUpcoming")}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {upcoming.map((b) => (
            <li key={b.id} className="rounded-2xl border border-border bg-bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-text-base">
                    {dateStr(b.starts_at)}
                  </p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {t("clientSpace.with")}{" "}
                    {b.coach_slug ? (
                      <Link href={`/${b.coach_slug}`} className="text-accent hover:underline">
                        {b.coach_name}
                      </Link>
                    ) : (
                      b.coach_name
                    )}
                    {b.location === "online" && ` · ${t("clientSpace.online")}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusChip[b.status]?.cls ?? ""}`}
                >
                  {statusChip[b.status]?.label ?? b.status}
                </span>
              </div>

              <div className="mt-3 border-t border-border pt-2.5">
                {cancelId === b.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-text-muted">
                      {b.escrow_status === "held" && b.amount_cents
                        ? `${t("clientSpace.cancelRefund")} ${refundPct(b)}% (${(((b.amount_cents ?? 0) * refundPct(b)) / 10000).toLocaleString(loc, { style: "currency", currency: "EUR" })}).`
                        : t("clientSpace.cancelFree")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1 px-3 py-2 text-xs"
                        onClick={() => setCancelId(null)}
                      >
                        {t("clientSpace.keep")}
                      </Button>
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={() => cancel(b.id)}
                        className="flex-1 rounded-full bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                      >
                        {cancelling
                          ? t("clientSpace.cancelling")
                          : t("clientSpace.confirmCancel")}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelId(b.id)}
                    className="text-xs font-medium text-text-dim transition-colors hover:text-red-400"
                  >
                    {t("clientSpace.cancelBtn")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Passées */}
      {past.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("clientSpace.past")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {past.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-text-base">
                    {dateStr(b.starts_at)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t("clientSpace.with")} {b.coach_name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusChip[b.status]?.cls ?? ""}`}
                  >
                    {statusChip[b.status]?.label ?? b.status}
                  </span>
                  {b.status !== "cancelled" && (
                    <Link
                      href={`/reservation/${b.id}`}
                      className="rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10"
                    >
                      ⭐ {t("clientSpace.rate")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
