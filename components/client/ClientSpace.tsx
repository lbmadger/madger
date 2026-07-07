"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { TicketIcon, RepeatIcon, StarIcon } from "@/components/ui/icons";
import {
  refundFraction,
  type CancellationPolicy,
} from "@/lib/booking/cancellation";

export type ClientPack = {
  id: string;
  total: number;
  used: number;
  service_name: string;
  coach_name: string;
};

export type ClientSub = {
  id: string;
  service_name: string;
  coach_name: string;
  price_cents: number;
  status: string;
  current_period_end: string | null;
};

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
  packs = [],
  subs = [],
}: {
  bookings: ClientBooking[];
  packs?: ClientPack[];
  subs?: ClientSub[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subCancelling, setSubCancelling] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  // Arrêt d'un abonnement mensuel : reste actif jusqu'à la fin de la période
  // payée, puis plus aucun prélèvement.
  async function cancelSub(id: string) {
    if (!window.confirm(t("clientSubs.confirmStop"))) return;
    setSubCancelling(id);
    setSubError(null);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: id }),
      });
      if (!res.ok) {
        setSubError(id);
        return;
      }
      router.refresh();
    } catch {
      setSubError(id);
    } finally {
      setSubCancelling(null);
    }
  }

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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
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

      {/* Deux colonnes sur grand écran : séances à gauche, abonnements et
          packs à droite. Une seule colonne sur mobile (ordre inchangé). */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <aside className="min-w-0 lg:order-2">
      {/* Abonnements mensuels */}
      {subs.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("clientSubs.title")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {subs.map((s) => {
              const active = s.status === "active";
              const canceling = s.status === "canceling";
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border bg-bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-base">
                        <RepeatIcon size={15} className="mr-1.5 inline-block align-[-2px] text-accent" />{s.service_name}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {t("packs.at")} {s.coach_name} ·{" "}
                        {(s.price_cents / 100).toLocaleString(loc, {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits:
                            s.price_cents % 100 === 0 ? 0 : 2,
                        })}
                        {t("clientSubs.perMonth")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        active
                          ? "bg-accent/10 text-accent"
                          : canceling
                          ? "bg-yellow-400/10 text-yellow-400"
                          : "border border-border-strong text-text-dim"
                      }`}
                    >
                      {active
                        ? t("clientSubs.active")
                        : canceling
                        ? t("clientSubs.canceling")
                        : t("clientSubs.inactive")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                    <p className="text-xs text-text-dim">
                      {s.current_period_end
                        ? `${canceling ? t("clientSubs.endsOn") : t("clientSubs.renewsOn")} ${new Date(s.current_period_end).toLocaleDateString(loc, { day: "numeric", month: "long" })}`
                        : ""}
                    </p>
                    {active && (
                      <button
                        type="button"
                        disabled={subCancelling === s.id}
                        onClick={() => cancelSub(s.id)}
                        className="text-xs font-medium text-text-dim transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        {subCancelling === s.id
                          ? t("clientSpace.cancelling")
                          : t("clientSubs.stopBtn")}
                      </button>
                    )}
                  </div>
                  {subError === s.id && (
                    <p className="mt-2 text-xs text-red-400">
                      {t("clientSpace.cancelError")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Packs de séances */}
      {packs.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("packs.title")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {packs.map((p) => {
              const left = Math.max(0, p.total - p.used);
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-border bg-bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-base">
                        <TicketIcon size={15} className="mr-1.5 inline-block align-[-2px] text-accent" />{p.service_name}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {t("packs.at")} {p.coach_name} · {p.used}{" "}
                        {t("packs.usedOf")} {p.total}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        left > 0
                          ? "bg-accent/10 text-accent"
                          : "border border-border-strong text-text-dim"
                      }`}
                    >
                      {left > 0
                        ? `${left} ${left === 1 ? t("packs.remainingOne") : t("packs.remainingMany")}`
                        : t("packs.empty")}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((p.used / p.total) * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      </aside>

      <div className="min-w-0 lg:order-1">
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

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-2.5">
                {/* Accès direct au suivi : lien visio, ajout calendrier,
                    détails. Sans dépendre de l'email de confirmation. */}
                <Link
                  href={`/reservation/${b.id}`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {b.location === "online"
                    ? t("clientSpace.viewBookingOnline")
                    : t("clientSpace.viewBooking")}{" "}
                  ›
                </Link>
                {cancelId === b.id ? (
                  <div className="flex w-full flex-col gap-2">
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
                      <StarIcon size={11} className="mr-1 inline-block align-[-1px]" />{t("clientSpace.rate")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
      </div>
    </main>
  );
}
