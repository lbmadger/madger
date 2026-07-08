"use client";

import { useEffect, useRef, useState } from "react";

// Tuile de statistique animée (comme le mockup de la landing) : entrée en
// fondu + compteur qui monte jusqu'à la valeur. Types de format gérés :
// monnaie (centimes), entier, pourcentage, décimal (note ⭐).
// Sans framer-motion : IntersectionObserver pour le déclenchement à la vue,
// requestAnimationFrame pour le compteur, transition CSS pour le fondu.

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
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);

  // Déclenchement à l'entrée dans le viewport (une seule fois).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "-30px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compteur en requestAnimationFrame avec sortie douce (ease-out cubique).
  // Motricité réduite : on affiche directement la valeur finale.
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const duration = 1300;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <div
      ref={ref}
      className="h-full rounded-2xl border border-border bg-bg-card p-4 sm:p-5 transition-[opacity,transform] duration-500"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(14px)",
        transitionDelay: `${index * 0.06}s`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
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
              trend.positive ? "text-accent" : "text-danger"
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
    </div>
  );
}
