"use client";

import { useEffect, useMemo, useState } from "react";
import AreaChart from "./AreaChart";
import type { BarDatum } from "./MiniBars";
import type { StatTrend } from "@/components/dashboard/AnimatedStat";

// Carte graphique « héros » : grand chiffre du mois + tendance, sélecteur de
// période, et graphique en aire premium. Reprend la logique de plage de
// ChartCard mais avec un rendu bien plus spectaculaire.

const PRESETS: Record<"months" | "weeks", { label: string; count: number }[]> =
  {
    months: [
      { label: "3M", count: 3 },
      { label: "6M", count: 6 },
      { label: "12M", count: 12 },
    ],
    weeks: [
      { label: "4S", count: 4 },
      { label: "8S", count: 8 },
      { label: "12S", count: 12 },
    ],
  };

export default function AreaChartCard({
  title,
  headline,
  trend = null,
  data,
  unit = "count",
  locale = "fr-FR",
  mode,
}: {
  title: string;
  headline: string;
  trend?: StatTrend;
  data: BarDatum[];
  unit?: "currency" | "count";
  locale?: string;
  mode: "months" | "weeks";
}) {
  const presets = PRESETS[mode];

  const usefulLen = useMemo(() => {
    const i = data.findIndex((d) => d.value > 0);
    return i === -1 ? 0 : data.length - i;
  }, [data]);

  const defaultIdx = useMemo(() => {
    const i = presets.findIndex((p) => p.count >= usefulLen);
    return i === -1 ? presets.length : i;
  }, [presets, usefulLen]);

  const [sel, setSel] = useState(defaultIdx);

  const storageKey = `madger_area_range_${mode}_${title}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const i = Number(saved);
        if (Number.isInteger(i) && i >= 0 && i <= presets.length) setSel(i);
      }
    } catch {
      /* stockage indisponible : on garde le défaut */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(i: number) {
    setSel(i);
    try {
      localStorage.setItem(storageKey, String(i));
    } catch {
      /* ignore */
    }
  }

  const isMax = sel >= presets.length;
  const count = isMax ? data.length : presets[sel].count;
  const shown = data.slice(-Math.min(Math.max(count, 2), data.length));
  const showMax = data.length > presets[presets.length - 1].count;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
      {/* Halo d'ambiance derrière le graphe */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/[0.06] blur-[90px]"
      />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-dim">
            {title}
          </h3>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-text-base sm:text-4xl">
              {headline}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.positive ? "text-success" : "text-danger"
                }`}
              >
                {trend.positive ? "↑" : "↓"} {trend.text}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {presets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => select(i)}
              aria-pressed={sel === i}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                sel === i
                  ? "bg-accent text-black"
                  : "border border-border-strong text-text-dim hover:text-text-base"
              }`}
            >
              {p.label}
            </button>
          ))}
          {showMax && (
            <button
              type="button"
              onClick={() => select(presets.length)}
              aria-pressed={isMax}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                isMax
                  ? "bg-accent text-black"
                  : "border border-border-strong text-text-dim hover:text-text-base"
              }`}
            >
              Max
            </button>
          )}
        </div>
      </div>
      {/* key = plage : rejoue l'animation de tracé à chaque changement */}
      <AreaChart
        key={shown.length}
        data={shown}
        unit={unit}
        locale={locale}
      />
    </section>
  );
}
