"use client";

import { useEffect, useMemo, useState } from "react";
import MiniBars, { type BarDatum } from "./MiniBars";

// Carte graphique avec sélecteur de période (en haut à droite). La plage par
// défaut est la plus petite qui couvre tout l'historique utile : si le coach
// n'a que 2 mois de données, on ouvre sur 3M au lieu d'un grand vide.

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

export default function ChartCard({
  title,
  data,
  unit = "count",
  locale = "fr-FR",
  mode,
}: {
  title: string;
  data: BarDatum[];
  unit?: "currency" | "count";
  locale?: string;
  mode: "months" | "weeks";
}) {
  const presets = PRESETS[mode];

  // Historique utile : depuis la première période avec de la donnée.
  const usefulLen = useMemo(() => {
    const i = data.findIndex((d) => d.value > 0);
    return i === -1 ? 0 : data.length - i;
  }, [data]);

  // Index par défaut : plus petit préréglage couvrant l'utile ; sinon Max.
  const defaultIdx = useMemo(() => {
    const i = presets.findIndex((p) => p.count >= usefulLen);
    return i === -1 ? presets.length : i;
  }, [presets, usefulLen]);

  const [sel, setSel] = useState(defaultIdx);

  // Mémorise le dernier réglage choisi (par type de graphique) : on le
  // retrouve en revenant sur la page. Hydraté après montage pour ne pas
  // désynchroniser le rendu serveur.
  const storageKey = `madger_chart_range_${mode}_${title}`;
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

  // "Max" seulement utile si l'historique dépasse le plus grand préréglage.
  const showMax = data.length > presets[presets.length - 1].count;

  return (
    <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-dim">
          {title}
        </h3>
        <div className="flex shrink-0 gap-1">
          {presets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => select(i)}
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
      <MiniBars data={shown} unit={unit} locale={locale} />
    </section>
  );
}
