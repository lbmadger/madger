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
  const [view, setView] = useState<"week" | "list">("week");

  const loc = locale === "fr" ? "fr-FR" : "en-US";

  // Confirme ou refuse une demande de séance.
  async function setStatus(id: string, status: "confirmed" | "cancelled") {
    const supabase = createClient();
    await supabase.from("bookings").update({ status }).eq("id", id);
    router.refresh();
  }

  // Annule une séance confirmée. Si un paiement est sous séquestre, le
  // remboursement (selon la formule d'annulation ou intégral si le coach
  // annule) est exécuté côté serveur.
  async function cancelBooking(id: string, by: "coach" | "client") {
    setCancelling(true);
    try {
      await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, by }),
      });
      setCancelId(null);
      router.refresh();
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
    if (!b.clients) return "—";
    return [b.clients.first_name, b.clients.last_name]
      .filter(Boolean)
      .join(" ");
  }

  // Pas de client → on invite à en créer un d'abord.
  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
        <h3 className="text-base font-semibold text-text-base">
          {t("agenda.needClientTitle")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          {t("agenda.needClientDesc")}
        </p>
        <Link
          href="/dashboard/clients"
          className="cta-shine mt-5 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition-all hover:scale-[1.02] active:scale-95"
        >
          {t("agenda.goToClients")}
        </Link>
      </div>
    );
  }

  return (
    <>
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
          <Button
            onClick={() => setAdding(true)}
            className="whitespace-nowrap px-4 py-2.5"
          >
            + {t("agenda.add")}
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <WeekView bookings={initialBookings} availabilities={availabilities} />
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
                          b.location === "online"
                            ? "bg-accent/10 text-accent"
                            : "border border-border-strong text-text-muted"
                        }`}
                      >
                        {t(`agenda.badge.${b.location}`)}
                      </span>
                    </div>
                   </div>

                   {/* Actions sur une demande en attente. Le refus passe par
                       l'API d'annulation : si la demande était payée (séquestre),
                       le client est remboursé à 100 %. */}
                   {b.status === "pending" && (
                     <div className="mt-2 flex gap-2 border-t border-border pt-2">
                       <button
                         type="button"
                         disabled={cancelling}
                         onClick={() => cancelBooking(b.id, "coach")}
                         className="flex-1 rounded-full border border-border-strong py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base disabled:opacity-50"
                       >
                         {t("agenda.decline")}
                       </button>
                       <button
                         type="button"
                         onClick={() => setStatus(b.id, "confirmed")}
                         className="flex-1 rounded-full bg-accent py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                       >
                         {t("agenda.confirm")}
                       </button>
                     </div>
                   )}

                   {/* Modifier une demande en attente */}
                   {b.status === "pending" && (
                     <button
                       type="button"
                       onClick={() => setEditing(b)}
                       className="mt-1.5 self-start text-xs font-medium text-text-dim transition-colors hover:text-accent"
                     >
                       ✏️ {t("agenda.edit")}
                     </button>
                   )}

                   {/* Modifier / annuler une séance confirmée */}
                   {b.status === "confirmed" && (
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
                             ✏️ {t("agenda.edit")}
                           </button>
                           <button
                             type="button"
                             onClick={() => setCancelId(b.id)}
                             className="text-xs font-medium text-text-dim transition-colors hover:text-red-400"
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
