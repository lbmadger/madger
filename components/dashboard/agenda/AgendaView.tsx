"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Booking, ClientOption } from "@/lib/bookings/types";
import type { Availability } from "@/lib/availability/types";
import AddSessionModal from "./AddSessionModal";
import WeekView from "./WeekView";
import Button from "@/components/ui/Button";
import { PencilIcon } from "@/components/ui/icons";

function dayKey(iso: string): string {
  // Regroupe par jour LOCAL (et non UTC), sinon une séance pile à minuit
  // pourrait tomber sur le mauvais jour.
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AgendaView({
  initialBookings,
  clients,
  availabilities = [],
}: {
  initialBookings: Booking[];
  clients: ClientOption[];
  availabilities?: Availability[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Clé i18n du message d'erreur d'action + séance concernée (l'erreur ne
  // s'affiche que sous la carte visée, pas sous toutes les demandes).
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorId, setActionErrorId] = useState<string | null>(null);
  // Vue Liste d'office quand des demandes attendent : c'est LE geste du
  // modèle validation manuelle, il doit sauter aux yeux.
  const [view, setView] = useState<"week" | "list">(() =>
    initialBookings.some(
      (b) =>
        b.status === "pending" &&
        !b.is_block &&
        new Date(b.ends_at).getTime() >= Date.now()
    )
      ? "list"
      : "week"
  );
  // Séance sélectionnée depuis la grille semaine (confirmer/refuser/modifier).
  const [selected, setSelected] = useState<Booking | null>(null);
  // Blocage d'un créneau (façon Airbnb) : aucune réservation possible dessus.
  const [blocking, setBlocking] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockFrom, setBlockFrom] = useState("09:00");
  const [blockTo, setBlockTo] = useState("12:00");
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const loc = locale === "fr" ? "fr-FR" : "en-US";

  // Crée le blocage : une séance sans client marquée is_block, que les
  // créneaux publics et les contrôles de chevauchement excluent déjà.
  async function submitBlock() {
    setBlockError(null);
    if (!blockDate || !blockFrom || !blockTo || blockTo <= blockFrom) {
      setBlockError("agenda.errors.dateRequired");
      return;
    }
    setBlockSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBlockError("agenda.errors.generic");
        return;
      }
      const starts = new Date(`${blockDate}T${blockFrom}`);
      const ends = new Date(`${blockDate}T${blockTo}`);
      const { data: overlapping } = await supabase
        .from("bookings")
        .select("id")
        .in("status", ["pending", "confirmed"])
        .lt("starts_at", ends.toISOString())
        .gt("ends_at", starts.toISOString())
        .limit(1);
      if ((overlapping ?? []).length > 0) {
        setBlockError("agenda.errors.overlap");
        return;
      }
      const { error } = await supabase.from("bookings").insert({
        coach_id: user.id,
        client_id: null,
        is_block: true,
        status: "confirmed",
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        location: "in_person",
      });
      if (error) {
        setBlockError("agenda.errors.generic");
        return;
      }
      setBlocking(false);
      router.refresh();
    } catch {
      setBlockError("agenda.errors.generic");
    } finally {
      setBlockSaving(false);
    }
  }

  // Supprime un blocage (le créneau redevient réservable).
  async function unblock(id: string) {
    const supabase = createClient();
    await supabase.from("bookings").delete().eq("id", id);
    setSelected(null);
    router.refresh();
  }

  // Confirme une demande : passe par l'API pour envoyer l'email au client.
  async function confirmBooking(id: string) {
    setConfirming(true);
    setActionError(null);
    setActionErrorId(id);
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(
          data.error === "capture_failed"
            ? "agenda.errors.captureFailed"
            : data.error === "too_late"
            ? "agenda.errors.tooLate"
            : "agenda.actionError"
        );
        return;
      }
      setSelected(null);
      router.refresh();
    } catch {
      setActionError("agenda.actionError");
    } finally {
      setConfirming(false);
    }
  }

  // Annule une séance confirmée. Si un paiement est sous séquestre, le
  // remboursement (selon la formule d'annulation ou intégral si le coach
  // annule) est exécuté côté serveur.
  async function cancelBooking(id: string, by: "coach" | "client") {
    setCancelling(true);
    setActionError(null);
    setActionErrorId(id);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, by }),
      });
      if (!res.ok) {
        setActionError("agenda.actionError");
        return;
      }
      setCancelId(null);
      setSelected(null);
      router.refresh();
    } catch {
      setActionError("agenda.actionError");
    } finally {
      setCancelling(false);
    }
  }

  // Séances à venir uniquement (>= maintenant), regroupées par jour.
  const groups = useMemo(() => {
    const now = Date.now();
    const upcoming = initialBookings.filter(
      (b) => new Date(b.ends_at).getTime() >= now && b.status !== "cancelled"
    );
    const map = new Map<string, Booking[]>();
    for (const b of upcoming) {
      const k = dayKey(b.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return Array.from(map.entries());
  }, [initialBookings]);

  function dayLabel(key: string): string {
    const d = new Date(key + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const sameDay = (a: Date, b: Date) =>
      a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return t("agenda.today");
    if (sameDay(d, tomorrow)) return t("agenda.tomorrow");
    return d.toLocaleDateString(loc, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function timeRange(b: Booking): string {
    const opts: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const s = new Date(b.starts_at).toLocaleTimeString(loc, opts);
    const e = new Date(b.ends_at).toLocaleTimeString(loc, opts);
    return `${s} – ${e}`;
  }

  function clientName(b: Booking): string {
    if (b.is_block) return t("agenda.blocked");
    if (!b.clients) return "-";
    return [b.clients.first_name, b.clients.last_name]
      .filter(Boolean)
      .join(" ");
  }

  // Demandes en attente à venir : bandeau prioritaire en tête d'agenda.
  const pendingRequests = initialBookings.filter(
    (b) =>
      b.status === "pending" &&
      !b.is_block &&
      new Date(b.ends_at).getTime() >= Date.now()
  );

  return (
    <>
      {/* Demandes à confirmer : LE geste critique, affiché avant tout le
          reste avec confirmation/refus en un clic. */}
      {pendingRequests.length > 0 && (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/[0.05] p-4">
          <p className="text-sm font-semibold text-text-base">
            {pendingRequests.length}{" "}
            {pendingRequests.length > 1
              ? t("agenda.pendingBannerPlural")
              : t("agenda.pendingBanner")}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingRequests.slice(0, 3).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-card px-3 py-2.5 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-base">
                    {clientName(b)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(b.starts_at).toLocaleDateString(loc, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    · {timeRange(b)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={cancelling || confirming}
                    onClick={() => {
                      if (window.confirm(t("agenda.declineConfirm")))
                        cancelBooking(b.id, "coach");
                    }}
                    className="rounded-full border border-border-strong px-3.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                  >
                    {cancelling && actionErrorId === b.id
                      ? "…"
                      : t("agenda.decline")}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling || confirming}
                    onClick={() => confirmBooking(b.id)}
                    className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {confirming && actionErrorId === b.id
                      ? "…"
                      : t("agenda.confirm")}
                  </button>
                </div>
                {actionError && actionErrorId === b.id && (
                  <p className="w-full text-xs text-danger">{t(actionError)}</p>
                )}
              </li>
            ))}
          </ul>
          {pendingRequests.length > 3 && (
            <button
              type="button"
              onClick={() => setView("list")}
              className="mt-2 text-xs font-medium text-accent hover:underline"
            >
              {t("agenda.pendingSeeAll")}
            </button>
          )}
        </div>
      )}

      {/* Pas encore de client : bannière (le calendrier reste visible pour
          poser ses disponibilités et voir la semaine). */}
      {clients.length === 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/[0.04] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-base">
              {t("agenda.needClientTitle")}
            </p>
            <p className="text-xs text-text-muted">
              {t("agenda.needClientDesc")}
            </p>
          </div>
          <Link
            href="/dashboard/clients"
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("agenda.goToClients")}
          </Link>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between gap-3">
        {/* Sélecteur de vue Semaine / Liste */}
        <div className="inline-flex rounded-full border border-border-strong p-0.5">
          {(["week", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-accent text-black"
                  : "text-text-muted hover:text-text-base"
              }`}
            >
              {v === "week" ? t("agenda.viewWeek") : t("agenda.viewList")}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/disponibilites"
            className="hidden whitespace-nowrap rounded-full border border-border-strong px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base sm:inline-flex"
          >
            {t("availability.title")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setBlockError(null);
              setBlocking(true);
            }}
            className="whitespace-nowrap rounded-full border border-border-strong px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-text-base"
          >
            {t("agenda.blockBtn")}
          </button>
          <Button
            onClick={() => setAdding(true)}
            disabled={clients.length === 0}
            title={
              clients.length === 0 ? t("agenda.needClientTitle") : undefined
            }
            className="whitespace-nowrap px-4 py-2.5"
          >
            + {t("agenda.add")}
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <WeekView
          bookings={initialBookings}
          availabilities={availabilities}
          onBookingClick={(b) => {
            setActionError(null);
            setSelected(b);
          }}
        />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-text-base">
            {t("agenda.emptyTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {t("agenda.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([key, items]) => (
            <section key={key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim first-letter:uppercase">
                {dayLabel(key)}
              </h3>
              <ul className="flex flex-col gap-2">
                {items.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-2xl border border-border bg-bg-card p-3"
                  >
                   <div className="flex items-center gap-3">
                    <div className="flex w-20 shrink-0 flex-col">
                      <span className="text-sm font-semibold text-text-base">
                        {new Date(b.starts_at).toLocaleTimeString(loc, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-[11px] text-text-dim">
                        {timeRange(b)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-base">
                        {clientName(b)}
                      </span>
                      {(b.location_text || b.meeting_url) && (
                        <span className="block truncate text-xs text-text-muted">
                          {b.location === "online"
                            ? b.meeting_url
                            : b.location_text}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {b.status === "pending" && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-black">
                          {t("agenda.pending")}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          b.is_block
                            ? "border border-border-strong text-text-muted"
                            : b.location === "online"
                            ? "bg-accent/10 text-accent"
                            : "border border-border-strong text-text-muted"
                        }`}
                      >
                        {b.is_block
                          ? t("agenda.blocked")
                          : t(`agenda.badge.${b.location}`)}
                      </span>
                    </div>
                   </div>

                   {/* Créneau bloqué : une seule action, le libérer */}
                   {b.is_block && (
                     <button
                       type="button"
                       onClick={() => unblock(b.id)}
                       className="mt-2 self-start border-t border-border pt-2 text-xs font-medium text-text-dim transition-colors hover:text-accent"
                     >
                       {t("agenda.unblock")}
                     </button>
                   )}

                   {/* Actions sur une demande en attente. Le refus passe par
                       l'API d'annulation : si la demande était payée (séquestre),
                       le client est remboursé à 100 %. */}
                   {b.status === "pending" && (
                     <div className="mt-2 border-t border-border pt-2">
                       <div className="flex gap-2">
                         <button
                           type="button"
                           disabled={cancelling || confirming}
                           onClick={() => {
                             if (window.confirm(t("agenda.declineConfirm")))
                               cancelBooking(b.id, "coach");
                           }}
                           className="flex-1 rounded-full border border-border-strong py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                         >
                           {cancelling && actionErrorId === b.id
                             ? "…"
                             : t("agenda.decline")}
                         </button>
                         <button
                           type="button"
                           disabled={cancelling || confirming}
                           onClick={() => confirmBooking(b.id)}
                           className="flex-1 rounded-full bg-accent py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                         >
                           {confirming && actionErrorId === b.id
                             ? "…"
                             : t("agenda.confirm")}
                         </button>
                       </div>
                       {actionError && actionErrorId === b.id && (
                         <p className="mt-2 text-xs text-danger">
                           {t(actionError)}
                         </p>
                       )}
                     </div>
                   )}

                   {/* Modifier une demande en attente */}
                   {b.status === "pending" && (
                     <button
                       type="button"
                       onClick={() => setEditing(b)}
                       className="mt-1.5 self-start text-xs font-medium text-text-dim transition-colors hover:text-accent"
                     >
                       <PencilIcon size={11} className="mr-1 inline-block align-[-1px]" />{t("agenda.edit")}
                     </button>
                   )}

                   {/* Modifier / annuler une séance confirmée */}
                   {b.status === "confirmed" && !b.is_block && (
                     <div className="mt-2 border-t border-border pt-2">
                       {cancelId === b.id ? (
                         <div className="flex flex-col gap-2">
                           <p className="text-xs text-text-muted">
                             {t("agenda.cancelWho")}
                           </p>
                           <div className="flex gap-2">
                             <button
                               type="button"
                               disabled={cancelling}
                               onClick={() => cancelBooking(b.id, "client")}
                               className="flex-1 rounded-full border border-border-strong py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                             >
                               {t("agenda.cancelByClient")}
                             </button>
                             <button
                               type="button"
                               disabled={cancelling}
                               onClick={() => cancelBooking(b.id, "coach")}
                               className="flex-1 rounded-full border border-border-strong py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                             >
                               {t("agenda.cancelByCoach")}
                             </button>
                           </div>
                           <button
                             type="button"
                             onClick={() => setCancelId(null)}
                             className="self-start text-xs text-text-dim hover:text-text-muted"
                           >
                             {t("agenda.cancelKeep")}
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-4">
                           <button
                             type="button"
                             onClick={() => setEditing(b)}
                             className="text-xs font-medium text-text-dim transition-colors hover:text-accent"
                           >
                             <PencilIcon size={11} className="mr-1 inline-block align-[-1px]" />{t("agenda.edit")}
                           </button>
                           <button
                             type="button"
                             onClick={() => setCancelId(b.id)}
                             className="text-xs font-medium text-text-dim transition-colors hover:text-danger"
                           >
                             {t("agenda.cancelBooking")}
                           </button>
                         </div>
                       )}
                     </div>
                   )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Fiche d'une séance cliquée dans la grille semaine */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-text-base">
                  {clientName(selected)}
                </h2>
                <p className="mt-0.5 text-sm capitalize text-text-muted">
                  {new Date(selected.starts_at).toLocaleString(loc, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  selected.is_block
                    ? "border border-border-strong text-text-muted"
                    : selected.status === "pending"
                    ? "bg-warning/10 text-warning"
                    : "bg-accent/10 text-accent"
                }`}
              >
                {selected.is_block
                  ? t("agenda.blocked")
                  : selected.status === "pending"
                  ? t("agenda.pending")
                  : t(`agenda.badge.${selected.location}`)}
              </span>
            </div>

            {actionError && (
              <p className="mt-3 text-sm text-danger">{t(actionError)}</p>
            )}

            {selected.is_block ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs text-text-muted">
                  {t("agenda.blockDesc")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setSelected(null)}
                  >
                    {t("agenda.cancelKeep")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => unblock(selected.id)}
                    className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    {t("agenda.unblock")}
                  </button>
                </div>
              </div>
            ) : selected.status === "pending" ? (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={cancelling || confirming}
                    onClick={() => {
                      if (window.confirm(t("agenda.declineConfirm")))
                        cancelBooking(selected.id, "coach");
                    }}
                    className="flex-1 rounded-full border border-border-strong py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                  >
                    {cancelling ? "…" : t("agenda.decline")}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling || confirming}
                    onClick={() => confirmBooking(selected.id)}
                    className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {confirming ? "…" : t("agenda.confirm")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(selected);
                    setSelected(null);
                  }}
                  className="self-center text-xs font-medium text-text-dim transition-colors hover:text-accent"
                >
                  <PencilIcon size={11} className="mr-1 inline-block align-[-1px]" />{t("agenda.edit")}
                </button>
              </div>
            ) : selected.status === "confirmed" ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs text-text-muted">{t("agenda.cancelWho")}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => cancelBooking(selected.id, "client")}
                    className="flex-1 rounded-full border border-border-strong py-2.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                  >
                    {t("agenda.cancelByClient")}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => cancelBooking(selected.id, "coach")}
                    className="flex-1 rounded-full border border-border-strong py-2.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                  >
                    {t("agenda.cancelByCoach")}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(selected);
                      setSelected(null);
                    }}
                    className="text-xs font-medium text-text-dim transition-colors hover:text-accent"
                  >
                    <PencilIcon size={11} className="mr-1 inline-block align-[-1px]" />{t("agenda.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-xs text-text-dim hover:text-text-muted"
                  >
                    {t("agenda.cancelKeep")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  {t("agenda.cancelKeep")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blocage d'un créneau */}
      {blocking && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setBlocking(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold tracking-tight text-text-base">
              {t("agenda.blockBtn")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {t("agenda.blockDesc")}
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-muted">
                  {t("booking.date")}
                </span>
                <input
                  type="date"
                  value={blockDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none transition-colors focus:border-accent"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-text-muted">
                    {t("onboarding.fromLabel")}
                  </span>
                  <input
                    type="time"
                    value={blockFrom}
                    onChange={(e) => setBlockFrom(e.target.value)}
                    className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none transition-colors focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-text-muted">
                    {t("onboarding.toLabel")}
                  </span>
                  <input
                    type="time"
                    value={blockTo}
                    onChange={(e) => setBlockTo(e.target.value)}
                    className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none transition-colors focus:border-accent"
                  />
                </label>
              </div>

              {blockError && (
                <p className="text-sm text-danger">{t(blockError)}</p>
              )}

              <div className="mt-1 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setBlocking(false)}
                >
                  {t("booking.cancel")}
                </Button>
                <Button
                  className="flex-1"
                  disabled={blockSaving}
                  onClick={submitBlock}
                >
                  {blockSaving ? "…" : t("agenda.blockCta")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <AddSessionModal
          clients={clients}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <AddSessionModal
          clients={clients}
          booking={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
