"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";

// Tuile de statistique animée (comme le mockup de la landing) : entrée en
// fondu + compteur qui monte jusqu'à la valeur. Types de format gérés :
// monnaie (centimes), entier, pourcentage, décimal (note ⭐).

export type StatKind = "currency" | "int" | "percent" | "decimal1";
export type StatTrend = { text: string; positive: boolean } | null;

function fmt(v: number, kind: StatKind, locale: string): string {
  switch (kind) {
    case "currency":
      return (v / 100).toLocaleString(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: Math.round(v) % 100 === 0 ? 0 : 2,
      });
    case "percent":
      return `${Math.round(v)} %`;
    case "decimal1":
      return (Math.round(v * 10) / 10).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    default:
      return String(Math.round(v)).toLocaleString();
  }
}

export default function AnimatedStat({
  label,
  value,
  kind = "int",
  locale = "fr-FR",
  trend = null,
  hint,
  prefix = "",
  index = 0,
}: {
  label: string;
  value: number;
  kind?: StatKind;
  locale?: string;
  trend?: StatTrend;
  hint?: string;
  prefix?: string;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.3,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-text-base sm:text-3xl">
          {prefix}
          {fmt(inView ? display : value, kind, locale)}
        </span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${
              trend.positive ? "text-accent" : "text-red-400"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {trend.positive ? (
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              ) : (
                <path d="M7 7l10 10M17 17H8M17 17V8" />
              )}
            </svg>
            {trend.text}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-text-dim">{hint}</p>}
    </motion.div>
  );
}
