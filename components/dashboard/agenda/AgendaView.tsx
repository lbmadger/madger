"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Booking, ClientOption } from "@/lib/bookings/types";
import AddSessionModal from "./AddSessionModal";

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD (UTC) suffit pour regrouper
}

export default function AgendaView({
  initialBookings,
  clients,
}: {
  initialBookings: Booking[];
  clients: ClientOption[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const loc = locale === "fr" ? "fr-FR" : "en-US";

  // Séances à venir uniquement (>= maintenant), regroupées par jour.
  const groups = useMemo(() => {
    const now = Date.now();
    const upcoming = initialBookings.filter(
      (b) => new Date(b.ends_at).getTime() >= now
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
      <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
        <h3 className="text-base font-semibold text-text-base">
          {t("agenda.needClientTitle")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          {t("agenda.needClientDesc")}
        </p>
        <Link
          href="/dashboard/clients"
          className="mt-5 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          {t("agenda.goToClients")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-base">
          {t("agenda.upcoming")}
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="shrink-0 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          + {t("agenda.add")}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
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
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3"
                  >
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
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        b.location === "online"
                          ? "bg-accent/10 text-accent"
                          : "border border-border-strong text-text-muted"
                      }`}
                    >
                      {t(`agenda.badge.${b.location}`)}
                    </span>
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
    </>
  );
}
