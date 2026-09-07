"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import ClientBell from "@/components/client/ClientBell";
import { useConfirm } from "@/components/ui/useConfirm";
import { TicketIcon, RepeatIcon, StarIcon } from "@/components/ui/icons";
import SlotPickerModal from "@/components/client/SlotPickerModal";
import {
  refundCents,
  resolveRefundPolicy,
  creditRestoredIfCancelled,
} from "@/lib/booking/cancellation";

export type ClientPack = {
  id: string;
  total: number;
  used: number;
  service_name: string;
  coach_name: string;
  // active | expired | refunded | closed (migration 0056).
  status: string;
  expires_at: string | null;
  // Pour placer une séance sur les crédits (lot 1).
  coach_id: string;
  coach_slug: string | null;
  coach_booking_mode: string;
  duration_min: number;
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
  // Lieu de la séance en présentiel (salle + adresse), null en visio.
  place: string | null;
  coach_name: string;
  coach_slug: string | null;
  cancellation_policy: string;
  cancel_hours: number | null;
  // Séance réglée avec un crédit de pack (ou séance d'achat du pack) : pas
  // de remboursement, le crédit est rendu ou perdu selon le délai du pack.
  on_credit: boolean;
  credit_cancel_hours: number | null;
  refund_over_24h_pct: number | null;
  refund_under_24h_pct: number | null;
  escrow_status: string | null;
  amount_cents: number | null;
  // Pour afficher un remboursement EXACT (même formule que le serveur) :
  released_cents: number;
  refunded_cents: number;
  pack_total: number | null;
  pack_used: number | null;
  // Report par le coach en attente de réponse du client (migration 0057).
  reschedule_pending_until: string | null;
  rescheduled_from: string | null;
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
  const { confirm, dialog } = useConfirm();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);
  const [subCancelling, setSubCancelling] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  // Placer une séance sur un pack (par coach) / choisir un autre créneau
  // pour une séance déplacée par le coach.
  const [creditCoach, setCreditCoach] = useState<CoachCredits | null>(null);
  const [moveBooking, setMoveBooking] = useState<ClientBooking | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);

  // Crédits disponibles, regroupés par coach : c'est chez LE coach du pack
  // que la séance se place (couple client / coach strict).
  type CoachCredits = {
    coach_id: string;
    coach_name: string;
    coach_slug: string | null;
    booking_mode: string;
    duration_min: number;
    credits: number;
    expires_at: string | null;
  };
  const byCoach = new Map<string, CoachCredits>();
  const nowMs = Date.now();
  for (const p of packs) {
    if (p.status !== "active") continue;
    if (p.expires_at && new Date(p.expires_at).getTime() < nowMs) continue;
    const left = Math.max(0, p.total - p.used);
    if (left <= 0) continue;
    const cur = byCoach.get(p.coach_id);
    if (cur) {
      cur.credits += left;
      if (
        p.expires_at &&
        (!cur.expires_at || p.expires_at < cur.expires_at)
      ) {
        cur.expires_at = p.expires_at;
      }
    } else {
      byCoach.set(p.coach_id, {
        coach_id: p.coach_id,
        coach_name: p.coach_name,
        coach_slug: p.coach_slug,
        booking_mode: p.coach_booking_mode,
        duration_min: p.duration_min,
        credits: left,
        expires_at: p.expires_at,
      });
    }
  }
  const inProgress = Array.from(byCoach.values());
  // Coachs dont le pack est épuisé ou expiré, sans crédit restant : on
  // propose de reprendre un pack ou de réserver à l'unité.
  const exhausted = Array.from(
    new Map(
      packs
        .filter((p) => !byCoach.has(p.coach_id) && p.coach_slug)
        .map((p) => [p.coach_id, p])
    ).values()
  );

  async function bookOnCredits(slots: string[]): Promise<string | null> {
    if (!creditCoach) return null;
    try {
      const res = await fetch("/api/bookings/book-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: creditCoach.coach_id, slots }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (j as { error?: string }).error ?? "generic";
        return t(`creditBooking.errors.${["slot_taken", "too_soon", "no_credit", "not_enough_credits"].includes(code) ? code : "generic"}`);
      }
      const confirmed = (j as { confirmed?: boolean }).confirmed;
      setCreditCoach(null);
      setFlash(
        confirmed
          ? t("creditBooking.done")
          : t("creditBooking.donePending").replace("{coach}", creditCoach.coach_name)
      );
      router.refresh();
      return null;
    } catch {
      return t("creditBooking.errors.generic");
    }
  }

  async function answerProposal(
    b: ClientBooking,
    action: "confirm" | "move",
    startsAt?: string
  ): Promise<string | null> {
    setProposalBusy(b.id);
    try {
      const res = await fetch("/api/bookings/client-reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: b.id, action, starts_at: startsAt }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (j as { error?: string }).error ?? "generic";
        return t(`creditBooking.errors.${["slot_taken", "too_soon"].includes(code) ? code : "generic"}`);
      }
      setMoveBooking(null);
      setFlash(
        action === "confirm"
          ? t("clientSpace.proposalDone")
          : t("clientSpace.proposalMoved")
      );
      router.refresh();
      return null;
    } catch {
      return t("creditBooking.errors.generic");
    } finally {
      setProposalBusy(null);
    }
  }

  // Arrêt d'un abonnement mensuel : reste actif jusqu'à la fin de la période
  // payée, puis plus aucun prélèvement.
  async function cancelSub(id: string) {
    const ok = await confirm({
      title: t("clientSubs.stopTitle"),
      message: t("clientSubs.confirmStop"),
      confirmLabel: t("clientSubs.stopBtn"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
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

  // Petites stats du client : séances de la semaine en cours (lundi à
  // dimanche, passées et à venir) et total, annulations exclues. Calculées
  // sur les réservations déjà chargées : aucun aller-retour de plus.
  const nowD = new Date();
  const weekStart = new Date(nowD);
  weekStart.setHours(0, 0, 0, 0);
  // getDay() : 0 = dimanche → reculer au lundi de la semaine en cours.
  weekStart.setDate(nowD.getDate() - ((nowD.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const active = bookings.filter((b) => b.status !== "cancelled");
  const weekCount = active.filter((b) => {
    const d = new Date(b.starts_at);
    return d >= weekStart && d < weekEnd;
  }).length;
  const totalCount = active.length;

  function dateStr(iso: string): string {
    return new Date(iso).toLocaleString(loc, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Remboursement si annulation MAINTENANT : MÊME formule que le serveur
  // (prorata pack sur les séances restantes + plafond sur ce qui n'a été ni
  // versé au coach ni déjà remboursé), pour ne jamais promettre plus que ce
  // qui sera réellement rendu.
  function refundNow(b: ClientBooking): number {
    const amount = b.amount_cents ?? 0;
    if (amount <= 0) return 0;
    const base =
      b.pack_total && b.pack_total > 1
        ? Math.round(
            (amount *
              Math.max(0, b.pack_total - (b.pack_used ?? 0) + 1)) /
              b.pack_total
          )
        : amount;
    const wanted = refundCents(
      resolveRefundPolicy(b),
      new Date(b.starts_at),
      base
    );
    return Math.min(
      wanted,
      Math.max(0, amount - b.released_cents - b.refunded_cents)
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
      // Confirmation visible : sans elle, la carte changeait d'état sans
      // dire que l'annulation (et le remboursement éventuel) est actée.
      setCancelDone(true);
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
      cls: "bg-warning/10 text-warning",
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
      cls: "bg-danger/10 text-danger",
    },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {dialog}
      {creditCoach && creditCoach.coach_slug && (
        <SlotPickerModal
          coachSlug={creditCoach.coach_slug}
          coachName={creditCoach.coach_name}
          durationMin={creditCoach.duration_min}
          maxSelect={Math.min(5, creditCoach.credits)}
          title={t("creditBooking.title")}
          subtitle={`${t("clientSpace.with")} ${creditCoach.coach_name} · ${t("creditBooking.upTo").replace("{n}", String(Math.min(5, creditCoach.credits)))}`}
          submitLabel={t("creditBooking.submit")}
          onSubmit={bookOnCredits}
          onClose={() => setCreditCoach(null)}
        />
      )}
      {moveBooking && moveBooking.coach_slug && (
        <SlotPickerModal
          coachSlug={moveBooking.coach_slug}
          coachName={moveBooking.coach_name}
          durationMin={Math.max(
            15,
            Math.round(
              (new Date(moveBooking.ends_at).getTime() -
                new Date(moveBooking.starts_at).getTime()) /
                60000
            )
          )}
          maxSelect={1}
          title={t("clientSpace.proposalChoose")}
          submitLabel={t("creditBooking.moveSubmit")}
          onSubmit={(slots) => answerProposal(moveBooking, "move", slots[0])}
          onClose={() => setMoveBooking(null)}
        />
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base sm:text-3xl">
        {t("clientSpace.title")}
      </h1>

      {/* Navigation de l'espace client : pas de menu latéral ici, ces
          onglets en tiennent lieu. « Trouver un coach » n'y figure pas :
          il vit dans l'état vide et sur la marketplace, pas dans la nav. */}
      <nav className="mt-5 flex gap-5 border-b border-border">
        <span
          aria-current="page"
          className="-mb-px border-b-2 border-accent pb-2.5 text-sm font-semibold text-text-base"
        >
          {t("clientSpace.title")}
        </span>
        <Link
          href="/messages"
          className="-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {t("clientSpace.messages")}
        </Link>
        <Link
          href="/onboarding-client"
          className="-mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {t("clientSpace.myProfile")}
        </Link>
        <ClientBell />
      </nav>

      {/* Mini-stats : uniquement quand il y a de la matière, un espace vide
          n'a pas besoin de compteurs à zéro. */}
      {totalCount > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
          <div className="rounded-2xl border border-border bg-bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
              {t("clientSpace.statsWeek")}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-base">
              {weekCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
              {t("clientSpace.statsTotal")}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-base">
              {totalCount}
            </p>
          </div>
        </div>
      )}

      {/* Deux colonnes sur grand écran : séances à gauche, abonnements et
          packs à droite. Une seule colonne sur mobile (ordre inchangé). */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <aside className="min-w-0 lg:order-2">
      {/* En cours : crédits de pack à placer, par coach. Le bouton ouvre
          les créneaux du coach, plusieurs séances d'un coup possibles. */}
      {(inProgress.length > 0 || exhausted.length > 0) && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("clientSpace.inProgress")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {inProgress.map((c) => (
              <li
                key={c.coach_id}
                className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-base">
                      {c.coach_slug ? (
                        <Link href={`/${c.coach_slug}`} className="hover:underline">
                          {c.coach_name}
                        </Link>
                      ) : (
                        c.coach_name
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {c.credits}{" "}
                      {c.credits === 1
                        ? t("clientSpace.creditOne")
                        : t("clientSpace.creditMany")}
                      {c.expires_at
                        ? ` · ${t("packs.validUntil")} ${new Date(c.expires_at).toLocaleDateString(loc, { day: "numeric", month: "short" })}`
                        : ""}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-base font-extrabold text-black">
                    {c.credits}
                  </span>
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full py-2.5 text-sm"
                  disabled={!c.coach_slug}
                  onClick={() => setCreditCoach(c)}
                >
                  {t("clientSpace.placeSession")}
                </Button>
                {c.booking_mode === "approval" && (
                  <p className="mt-2 text-center text-[11px] text-text-dim">
                    {t("clientSpace.placeApprovalHint")}
                  </p>
                )}
              </li>
            ))}
            {exhausted.map((p) => (
              <li
                key={p.coach_id}
                className="rounded-2xl border border-border bg-bg-card p-4"
              >
                <p className="text-sm font-semibold text-text-base">
                  {p.coach_name}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {t("clientSpace.noCreditLeft")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/${p.coach_slug}`}
                    className="flex-1 rounded-full bg-accent px-3 py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    {t("clientSpace.rebuyPack")}
                  </Link>
                  <Link
                    href={`/${p.coach_slug}`}
                    className="flex-1 rounded-full border border-border-strong px-3 py-2 text-center text-xs font-semibold text-text-base transition-colors hover:border-accent"
                  >
                    {t("clientSpace.bookSingle")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

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
                          ? "bg-warning/10 text-warning"
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
                        className="text-xs font-medium text-text-dim transition-colors hover:text-danger disabled:opacity-50"
                      >
                        {subCancelling === s.id
                          ? t("clientSpace.cancelling")
                          : t("clientSubs.stopBtn")}
                      </button>
                    )}
                  </div>
                  {subError === s.id && (
                    <p className="mt-2 text-xs text-danger">
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
              // Un pack inactif (expiré, remboursé, clôturé) n'a plus de
              // crédit utilisable, quel que soit son compteur.
              const active = p.status === "active";
              const left = active ? Math.max(0, p.total - p.used) : 0;
              const pill = active
                ? left > 0
                  ? `${left} ${left === 1 ? t("packs.remainingOne") : t("packs.remainingMany")}`
                  : t("packs.empty")
                : p.status === "expired"
                ? t("packs.expired")
                : p.status === "refunded"
                ? t("packs.refunded")
                : t("packs.closed");
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
                        {active && p.expires_at
                          ? ` · ${t("packs.validUntil")} ${new Date(p.expires_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        left > 0
                          ? "bg-accent/10 text-accent"
                          : "border border-border-strong text-text-dim"
                      }`}
                    >
                      {pill}
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
      {cancelDone && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-center text-sm text-text-base"
        >
          {t("clientSpace.cancelDone")}
        </p>
      )}
      {flash && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-center text-sm text-text-base"
        >
          {flash}
        </p>
      )}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
        {t("clientSpace.upcoming")}
      </h2>
      {upcoming.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-border bg-bg-card p-6 text-center">
          <p className="text-sm text-text-muted">{t("clientSpace.noUpcoming")}</p>
          <Link
            href="/coachs"
            className="mt-3 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("clientSpace.findCoach")}
          </Link>
        </div>
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
                  {b.place && (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-text-dim">
                      <svg className="mt-0.5 shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                      </svg>
                      <span className="break-words">{b.place}</span>
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusChip[b.status]?.cls ?? ""}`}
                >
                  {statusChip[b.status]?.label ?? b.status}
                </span>
              </div>

              {/* Report par le coach : la séance est déjà déplacée, le
                  client confirme ou choisit un autre créneau. Sans réponse,
                  validation automatique à la date indiquée. */}
              {b.reschedule_pending_until &&
                new Date(b.reschedule_pending_until).getTime() > now && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-3">
                    <p className="text-xs font-semibold text-text-base">
                      {t("clientSpace.proposalTitle").replace("{coach}", b.coach_name)}
                    </p>
                    {b.rescheduled_from && (
                      <p className="mt-0.5 text-xs text-text-muted">
                        {t("clientSpace.proposalOld")}{" "}
                        <span className="line-through">{dateStr(b.rescheduled_from)}</span>
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-text-dim">
                      {t("clientSpace.proposalAuto").replace(
                        "{date}",
                        new Date(b.reschedule_pending_until).toLocaleDateString(loc, {
                          day: "numeric",
                          month: "long",
                        })
                      )}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={proposalBusy === b.id}
                        onClick={() => answerProposal(b, "confirm")}
                        className="flex-1 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {t("clientSpace.proposalConfirm")}
                      </button>
                      <button
                        type="button"
                        disabled={proposalBusy === b.id || !b.coach_slug}
                        onClick={() => setMoveBooking(b)}
                        className="flex-1 rounded-full border border-border-strong px-3 py-2 text-xs font-semibold text-text-base transition-colors hover:border-accent disabled:opacity-50"
                      >
                        {t("clientSpace.proposalChoose")}
                      </button>
                    </div>
                  </div>
                )}

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
                      {b.on_credit
                        ? creditRestoredIfCancelled(
                            b.credit_cancel_hours ?? 24,
                            new Date(b.starts_at)
                          )
                          ? t("clientSpace.creditCancelFree").replace(
                              "{date}",
                              new Date(
                                new Date(b.starts_at).getTime() -
                                  (b.credit_cancel_hours ?? 24) * 3_600_000
                              ).toLocaleString(loc, {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            )
                          : t("clientSpace.creditCancelLost")
                        : b.escrow_status === "held" && b.amount_cents
                        ? `${t("clientSpace.cancelRefund")} ${(refundNow(b) / 100).toLocaleString(loc, { style: "currency", currency: "EUR" })} (${Math.round((refundNow(b) / Math.max(1, b.amount_cents ?? 0)) * 100)}%).`
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
                        className="flex-1 rounded-full bg-danger/15 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/25 disabled:opacity-50"
                      >
                        {cancelling
                          ? t("clientSpace.cancelling")
                          : t("clientSpace.confirmCancel")}
                      </button>
                    </div>
                    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelId(b.id)}
                    className="text-xs font-medium text-text-dim transition-colors hover:text-danger"
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
                    {t("clientSpace.with")}{" "}
                    {b.coach_slug ? (
                      <Link
                        href={`/${b.coach_slug}`}
                        className="text-accent hover:underline"
                      >
                        {b.coach_name}
                      </Link>
                    ) : (
                      b.coach_name
                    )}
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
