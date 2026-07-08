"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  type Availability,
  WEEK_ORDER,
  hhmm,
} from "@/lib/availability/types";

export default function AvailabilityEditor({
  initial,
}: {
  initial: Availability[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Regroupe les créneaux par jour.
  const byDay = new Map<number, Availability[]>();
  for (const a of initial) {
    if (!byDay.has(a.weekday)) byDay.set(a.weekday, []);
    byDay.get(a.weekday)!.push(a);
  }

  async function remove(id: string) {
    setBusy(true);
    setSaveError(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("availabilities")
      .delete()
      .eq("id", id);
    if (error) setSaveError(true);
    else router.refresh();
    setBusy(false);
  }

  async function add(weekday: number, start: string, end: string) {
    setBusy(true);
    setSaveError(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("availabilities").insert({
        coach_id: user.id,
        weekday,
        start_time: start,
        end_time: end,
      });
      if (error) setSaveError(true);
      else router.refresh();
    } else {
      setSaveError(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {saveError && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
          {t("availability.errors.saveFailed")}
        </p>
      )}
      {WEEK_ORDER.map(({ weekday, key }) => (
        <DayRow
          key={weekday}
          label={t(`availability.days.${key}`)}
          ranges={(byDay.get(weekday) ?? []).sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
          )}
          busy={busy}
          onAdd={(s, e) => add(weekday, s, e)}
          onRemove={remove}
        />
      ))}
    </div>
  );
}

function DayRow({
  label,
  ranges,
  busy,
  onAdd,
  onRemove,
}: {
  label: string;
  ranges: Availability[];
  busy: boolean;
  onAdd: (start: string, end: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);

  function submit() {
    if (end <= start) {
      setError(true);
      return;
    }
    setError(false);
    onAdd(start, end);
    setAdding(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-base">{label}</span>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium text-accent hover:underline"
          >
            + {t("availability.addRange")}
          </button>
        )}
      </div>

      {/* Créneaux existants */}
      <div className="mt-2 flex flex-wrap gap-2">
        {ranges.length === 0 && !adding && (
          <span className="text-xs text-text-dim">{t("availability.none")}</span>
        )}
        {ranges.map((r) => (
          <span
            key={r.id}
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs text-text-base"
          >
            {hhmm(r.start_time)} – {hhmm(r.end_time)}
            <button
              type="button"
              disabled={busy}
              // Confirmation avant suppression : évite de perdre une plage
              // d'un tap accidentel (action non annulable).
              onClick={() => {
                if (window.confirm(t("availability.removeConfirm"))) {
                  onRemove(r.id);
                }
              }}
              className="text-text-dim transition-colors hover:text-danger"
              aria-label={`${t("availability.remove")} : ${label} ${hhmm(r.start_time)} ${t("availability.to")} ${hhmm(r.end_time)}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {/* Ajout d'un créneau */}
      {adding && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label={`${t("availability.startTime")} (${label})`}
            className="rounded-lg border border-border-strong bg-white/[0.03] px-3 py-2 text-sm text-text-base outline-none focus:border-accent"
          />
          <span className="text-text-dim">{t("availability.to")}</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label={`${t("availability.endTime")} (${label})`}
            className="rounded-lg border border-border-strong bg-white/[0.03] px-3 py-2 text-sm text-text-base outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t("availability.add")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t("availability.errors.invalidRange")}
        </p>
      )}
    </div>
  );
}
