"use client";

import { useEffect, useState } from "react";

export type BarDatum = { label: string; value: number };

// Mini graphique en barres (mono-série, fond sombre). Barres fines arrondies
// en tête, gap de 2 px, baseline discrète, tooltip au survol/touch, valeur de
// la dernière barre affichée en direct (les autres via tooltip).
// `unit` plutôt qu'une fonction de format : les fonctions ne passent pas la
// frontière serveur → client.
export default function MiniBars({
  data,
  unit = "count",
  locale = "fr-FR",
}: {
  data: BarDatum[];
  unit?: "currency" | "count";
  locale?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  // Animation d'entrée : les barres poussent depuis la baseline, en cascade.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const format = (v: number) =>
    unit === "currency"
      ? (v / 100).toLocaleString(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: v % 100 === 0 ? 0 : 2,
        })
      : String(v);
  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data.length - 1;

  return (
    <div>
      {/* Zone de tracé */}
      <div className="relative flex h-28 items-end gap-0.5 border-b border-border">
        {data.map((d, i) => {
          const hPct = (d.value / max) * 100;
          const isActive = active === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${d.label} : ${format(d.value)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              {/* Étiquette directe : dernière barre uniquement (ou survol) */}
              {(isActive || (active === null && i === last && d.value > 0)) && (
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-base">
                  {format(d.value)}
                </span>
              )}
              <span
                className="w-full max-w-[26px] rounded-t transition-[height] duration-700 ease-out"
                style={{
                  height: mounted ? `max(${hPct}%, 3px)` : "3px",
                  transitionDelay: `${i * 45}ms`,
                  // Dégradé vertical (vif en tête, atténué en pied) + halo
                  // lumineux accentué sur la barre survolée.
                  background: isActive
                    ? "linear-gradient(180deg, #CBFF03, #9DCC00)"
                    : "linear-gradient(180deg, rgba(203,255,3,0.85), rgba(203,255,3,0.35))",
                  boxShadow: isActive
                    ? "0 0 10px rgba(203,255,3,0.55)"
                    : "none",
                }}
              />
            </button>
          );
        })}
      </div>
      {/* Axe X */}
      <div className="mt-1.5 flex gap-0.5">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 truncate text-center text-[9px] text-text-dim"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
