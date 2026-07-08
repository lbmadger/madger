"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Booking } from "@/lib/bookings/types";
import type { Availability } from "@/lib/availability/types";

// Vue calendrier : les disponibilités du coach apparaissent en fond (blocs
// accent translucides), les séances par-dessus. Desktop : grille de 7 jours.
// Mobile : vue JOUR (une seule colonne lisible, navigation par pastilles),
// fini le scroll horizontal dans le scroll vertical.

const HOUR_PX = 44; // hauteur d'une heure dans la grille

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Lundi de la semaine contenant `d`.
function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export default function WeekView({
  bookings,
  availabilities,
  onBookingClick,
  onSlotClick,
}: {
  bookings: Booking[];
  availabilities: Availability[];
  // Clic sur une séance de la grille (confirmer une demande, modifier…).
  onBookingClick?: (b: Booking) => void;
  // Clic sur une case horaire LIBRE : blocage direct du créneau (1 h),
  // façon Airbnb. Absent → cases inertes.
  onSlotClick?: (start: Date) => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [offset, setOffset] = useState(0); // 0 = semaine courante

  const days = useMemo(() => {
    const monday = mondayOf(new Date());
    monday.setDate(monday.getDate() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [offset]);

  const today = ymd(new Date());

  // Jour affiché en mobile : aujourd'hui si la semaine courante, sinon lundi.
  const [mobileDayIdx, setMobileDayIdx] = useState(0);
  useEffect(() => {
    const idx = days.findIndex((d) => ymd(d) === today);
    setMobileDayIdx(idx === -1 ? 0 : idx);
  }, [days, today]);

  // Bornes horaires de la grille : englobe dispos + séances (défaut 8 h – 20 h).
  const [startHour, endHour] = useMemo(() => {
    let min = 8 * 60;
    let max = 20 * 60;
    for (const a of availabilities) {
      min = Math.min(min, toMinutes(a.start_time));
      max = Math.max(max, toMinutes(a.end_time));
    }
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const s = new Date(b.starts_at);
      const e = new Date(b.ends_at);
      min = Math.min(min, s.getHours() * 60 + s.getMinutes());
      max = Math.max(max, e.getHours() * 60 + e.getMinutes());
    }
    return [Math.floor(min / 60), Math.min(24, Math.ceil(max / 60))];
  }, [availabilities, bookings]);

  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );
  const gridHeight = (endHour - startHour) * HOUR_PX;

  // Séances de la semaine affichée, par jour (clé locale AAAA-MM-JJ).
  const byDay = useMemo(() => {
    const keys = new Set(days.map(ymd));
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const k = ymd(new Date(b.starts_at));
      if (!keys.has(k)) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return map;
  }, [bookings, days]);

  const availByWeekday = useMemo(() => {
    const map = new Map<number, Availability[]>();
    for (const a of availabilities) {
      if (!map.has(a.weekday)) map.set(a.weekday, []);
      map.get(a.weekday)!.push(a);
    }
    return map;
  }, [availabilities]);

  const monthLabel = days[0].toLocaleDateString(loc, {
    month: "long",
    year: "numeric",
  });

  function top(minutes: number): number {
    return ((minutes - startHour * 60) / 60) * HOUR_PX;
  }

  function clientName(b: Booking): string {
    if (b.is_block) return t("agenda.blocked");
    if (!b.clients) return "-";
    return [b.clients.first_name, b.clients.last_name]
      .filter(Boolean)
      .join(" ");
  }

  // Gouttière des heures, partagée entre la grille semaine et la vue jour.
  function hourGutter() {
    return (
      <div className="relative" style={{ height: gridHeight }}>
        {hours.map((h) => (
          <span
            key={h}
            className="absolute right-1.5 -translate-y-1/2 text-[10px] text-text-dim"
            style={{ top: top(h * 60) || 8 }}
          >
            {String(h).padStart(2, "0")}h
          </span>
        ))}
      </div>
    );
  }

  // Colonne d'un jour (fond de dispos + séances positionnées), partagée
  // entre la grille semaine (7 colonnes) et la vue jour mobile (1 colonne).
  function dayColumn(d: Date) {
    const key = ymd(d);
    const isToday = key === today;
    const dayAvail = availByWeekday.get(d.getDay()) ?? [];
    const dayBookings = byDay.get(key) ?? [];
    return (
      <div
        key={key}
        className={`relative border-l border-border ${
          isToday ? "bg-accent/[0.03]" : ""
        }`}
        style={{ height: gridHeight }}
      >
        {/* Lignes horaires */}
        {hours.map((h) => (
          <span
            key={h}
            className="pointer-events-none absolute inset-x-0 border-t border-border/50"
            style={{ top: top(h * 60) }}
          />
        ))}

        {/* Cases horaires : un tap sur une case libre bloque le créneau.
            Rendues SOUS les séances (qui arrivent après dans le DOM) : une
            case occupée reçoit le clic de la séance, pas celui du blocage. */}
        {onSlotClick &&
          hours.map((h) => {
            const start = new Date(d);
            start.setHours(h, 0, 0, 0);
            if (start.getTime() < Date.now()) return null;
            return (
              <button
                key={`slot-${h}`}
                type="button"
                onClick={() => onSlotClick(start)}
                aria-label={`${t("agenda.blockCta")} ${start.toLocaleString(loc, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}
                title={t("agenda.tapToBlock")}
                className="absolute inset-x-0 transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.05]"
                style={{ top: top(h * 60), height: HOUR_PX }}
              />
            );
          })}

        {/* Disponibilités (fond) */}
        {dayAvail.map((a) => (
          <span
            key={a.id}
            className="pointer-events-none absolute inset-x-0.5 rounded-md border border-accent/20 bg-accent/[0.07]"
            style={{
              top: top(toMinutes(a.start_time)),
              height: top(toMinutes(a.end_time)) - top(toMinutes(a.start_time)),
            }}
          />
        ))}

        {/* Séances (dessus). Cliquables si un gestionnaire est fourni
            (confirmer/refuser une demande, modifier). */}
        {dayBookings.map((b) => {
          const s = new Date(b.starts_at);
          const e = new Date(b.ends_at);
          const sMin = s.getHours() * 60 + s.getMinutes();
          const eMin = e.getHours() * 60 + e.getMinutes();
          const h = Math.max(top(eMin) - top(sMin), 22);
          const inner = (
            <>
              <span className="block truncate text-[10px] font-semibold leading-tight text-text-base">
                {s.toLocaleTimeString(loc, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {h >= 34 && (
                <span className="block truncate text-[10px] leading-tight text-text-muted">
                  {clientName(b)}
                </span>
              )}
            </>
          );
          const cls = `absolute inset-x-1 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left ${
            b.is_block
              ? "border-border-strong bg-white/[0.06]"
              : b.status === "pending"
              ? "border-warning bg-warning/10"
              : "border-accent bg-bg-elevated"
          }`;
          const title = `${clientName(b)} · ${s.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}`;
          return onBookingClick ? (
            <button
              key={b.id}
              type="button"
              onClick={() => onBookingClick(b)}
              className={`${cls} cursor-pointer transition-opacity hover:opacity-80`}
              style={{ top: top(sMin), height: h }}
              title={title}
            >
              {inner}
            </button>
          ) : (
            <span
              key={b.id}
              className={cls}
              style={{ top: top(sMin), height: h }}
              title={title}
            >
              {inner}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card">
      {/* Barre de navigation de semaine */}
      <div className="flex items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
        <p className="text-sm font-semibold capitalize text-text-base">
          {monthLabel}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label={t("agenda.prevWeek")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-text-muted transition-colors hover:text-text-base"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {offset !== 0 && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base"
            >
              {t("agenda.todayBtn")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            aria-label={t("agenda.nextWeek")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-text-muted transition-colors hover:text-text-base"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* ── Mobile : vue JOUR ─────────────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Pastilles des 7 jours de la semaine */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {days.map((d, i) => {
            const isToday = ymd(d) === today;
            const active = i === mobileDayIdx;
            const count = (byDay.get(ymd(d)) ?? []).length;
            return (
              <button
                key={ymd(d)}
                type="button"
                onClick={() => setMobileDayIdx(i)}
                aria-pressed={active}
                className={`flex min-w-11 flex-1 flex-col items-center rounded-xl px-1 py-1.5 transition-colors ${
                  active ? "bg-accent/10" : "hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-text-dim">
                  {d.toLocaleDateString(loc, { weekday: "short" })}
                </span>
                <span
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday
                      ? "bg-accent text-black"
                      : active
                      ? "text-accent"
                      : "text-text-base"
                  }`}
                >
                  {d.getDate()}
                </span>
                {/* Point : au moins une séance ce jour-là */}
                <span
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    count > 0 ? "bg-accent" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[44px_1fr] pr-2">
          {hourGutter()}
          {dayColumn(days[mobileDayIdx])}
        </div>
      </div>

      {/* ── Desktop : grille SEMAINE (7 colonnes) ────────────────────────── */}
      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[720px]">
          {/* En-têtes de jours */}
          <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-border">
            <div />
            {days.map((d) => {
              const isToday = ymd(d) === today;
              return (
                <div key={ymd(d)} className="px-1 py-2 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-dim">
                    {d.toLocaleDateString(loc, { weekday: "short" })}
                  </p>
                  <p
                    className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? "bg-accent text-black" : "text-text-base"
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Corps : gouttière horaire + 7 colonnes */}
          <div className="grid grid-cols-[44px_repeat(7,1fr)]">
            {hourGutter()}
            {days.map((d) => dayColumn(d))}
          </div>
        </div>
      </div>

      {/* Légende + accès aux disponibilités */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 sm:px-4">
        <div className="flex items-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-accent/30 bg-accent/[0.12]" />
            {t("agenda.legendAvailable")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border-l-2 border-accent bg-bg-elevated" />
            {t("agenda.legendBooked")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border-l-2 border-warning bg-warning/10" />
            {t("agenda.pending")}
          </span>
          {onSlotClick && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-border-strong bg-white/[0.06]" />
              {t("agenda.tapToBlock")}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/disponibilites"
          className="text-[11px] font-medium text-accent hover:underline"
        >
          {availabilities.length === 0
            ? t("agenda.setAvailability")
            : t("availability.title")}
          {" →"}
        </Link>
      </div>
    </div>
  );
}
