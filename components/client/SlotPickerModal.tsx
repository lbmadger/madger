"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";

type Slot = { iso: string; label: string };
type Day = { date: string; slots: Slot[] };

// Sélecteur de créneaux de l'espace client : mêmes créneaux que la page
// publique du coach (/api/slots). Deux usages :
//  - placer une ou plusieurs séances sur un pack (multi-sélection, jusqu'à
//    `maxSelect` créneaux) ;
//  - choisir un autre créneau pour une séance déplacée (un seul).
export default function SlotPickerModal({
  coachSlug,
  coachName,
  durationMin,
  maxSelect,
  title,
  subtitle,
  submitLabel,
  onSubmit,
  onClose,
  maxPerWeek = null,
  weekCounts = {},
}: {
  coachSlug: string;
  coachName: string;
  durationMin: number;
  maxSelect: number;
  title: string;
  subtitle?: string;
  submitLabel: string;
  // Renvoie un message d'erreur (déjà traduit) ou null si tout est bon.
  onSubmit: (slots: string[]) => Promise<string | null>;
  onClose: () => void;
  // Limite hebdomadaire du pack et séances déjà posées par semaine (clé =
  // lundi AAAA-MM-JJ) : les semaines pleines sont grisées au lieu d'échouer
  // à l'envoi.
  maxPerWeek?: number | null;
  weekCounts?: Record<string, number>;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [days, setDays] = useState<Day[] | null>(null);
  const [free, setFree] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [dayIdx, setDayIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/slots?coach=${encodeURIComponent(coachSlug)}&duration=${durationMin}&locale=${locale}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { mode: string; days?: Day[] }) => {
        if (cancelled) return;
        if (j.mode === "free") {
          setFree(true);
          setDays([]);
          return;
        }
        const ds = j.days ?? [];
        setDays(ds);
        const firstWithSlots = ds.findIndex((d) => d.slots.length > 0);
        setDayIdx(firstWithSlots >= 0 ? firstWithSlots : 0);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [coachSlug, durationMin, locale]);

  const currentDay = days?.[dayIdx];

  // Semaine (lundi) d'une date locale AAAA-MM-JJ ou d'un instant ISO.
  function weekOf(dateISO: string): string {
    const d = dateISO.length === 10
      ? (() => { const [y, m, dd] = dateISO.split("-").map(Number); return new Date(y, m - 1, dd); })()
      : new Date(dateISO);
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const dd = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  // Séances déjà posées + sélection en cours, par semaine.
  function weekLoad(week: string): number {
    return (weekCounts[week] ?? 0) + selected.filter((iso) => weekOf(iso) === week).length;
  }
  function weekFull(dateISO: string): boolean {
    return !!maxPerWeek && weekLoad(weekOf(dateISO)) >= maxPerWeek;
  }
  const noSlotsAtAll = useMemo(
    () => !!days && days.every((d) => d.slots.length === 0),
    [days]
  );

  function dayChipLabel(dateISO: string): string {
    const [y, m, d] = dateISO.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(loc, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function toggle(iso: string) {
    setError(null);
    setSelected((xs) => {
      if (xs.includes(iso)) return xs.filter((x) => x !== iso);
      if (maxSelect <= 1) return [iso];
      if (xs.length >= maxSelect) return xs;
      return [...xs, iso].sort();
    });
  }

  async function submit() {
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const err = await onSubmit(selected);
      if (err) setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label={title}
      className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
      <h2 className="text-lg font-semibold text-text-base">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {subtitle ?? `${t("clientSpace.with")} ${coachName}`}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {loadError ? (
          <p className="rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-sm text-danger">
            {t("booking.slotsError")}
          </p>
        ) : days === null ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-bg-elevated" />
            ))}
          </div>
        ) : free || noSlotsAtAll ? (
          <div className="rounded-xl border border-border bg-bg-elevated p-4 text-center">
            <p className="text-sm text-text-muted">
              {free ? t("creditBooking.freeMode") : t("booking.noSlotsRange")}
            </p>
            <a
              href={`/messages`}
              className="mt-3 inline-block rounded-full border border-accent/40 px-4 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              {t("booking.contactCoach")}
            </a>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.map((d, i) => {
                const picked = d.slots.filter((s) => selected.includes(s.iso)).length;
                // Semaine au maximum du pack (hors jours où une sélection est déjà posée).
                const blocked = picked === 0 && weekFull(d.date);
                const empty = d.slots.length === 0 || blocked;
                const active = i === dayIdx;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={active}
                    disabled={empty}
                    title={blocked ? t("creditBooking.weekFull").replace("{n}", String(maxPerWeek)) : undefined}
                    onClick={() => setDayIdx(i)}
                    className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : empty
                        ? `border-border text-text-dim opacity-40 ${blocked ? "line-through" : ""}`
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {dayChipLabel(d.date)}
                    {picked > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
                        {picked}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {maxPerWeek && (
              <p className="text-[11px] text-text-dim">
                {t("creditBooking.weekLimit").replace("{n}", String(maxPerWeek))}
              </p>
            )}
            {currentDay && currentDay.slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {currentDay.slots.map((s) => {
                  const on = selected.includes(s.iso);
                  const full =
                    (!on && maxSelect > 1 && selected.length >= maxSelect) ||
                    (!on && weekFull(currentDay.date));
                  return (
                    <button
                      key={s.iso}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      onClick={() => toggle(s.iso)}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                        on
                          ? "border-accent bg-accent text-black"
                          : "border-border-strong text-text-base hover:border-accent/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-bg-elevated p-3 text-center text-xs text-text-dim">
                {t("booking.noSlotsDay")}
              </p>
            )}
          </>
        )}

        {selected.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl border border-accent/25 bg-accent/[0.05] px-3 py-2">
            {selected.map((iso) => (
              <li key={iso} className="flex items-center justify-between gap-2 text-xs text-text-base">
                <span className="capitalize">
                  {new Date(iso).toLocaleString(loc, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(iso)}
                  aria-label={t("common.delete")}
                  className="text-text-dim hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={submitting || selected.length === 0}
            onClick={submit}
            className="flex-1"
          >
            {submitting
              ? t("creditBooking.submitting")
              : maxSelect > 1 && selected.length > 1
              ? `${submitLabel} (${selected.length})`
              : submitLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
