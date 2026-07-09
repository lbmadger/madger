"use client";

import { useId, useRef, useState } from "react";
import type { BarDatum } from "./MiniBars";

// Graphique en aire premium (mono-série, fond sombre) : ligne lissée qui se
// dessine à l'entrée, dégradé sous la courbe, halo lumineux, point final
// pulsé, ligne de repère + info-bulle au survol. Coordonnées en viewBox fixe
// étirée à la largeur (preserveAspectRatio="none") ; les traits gardent leur
// épaisseur via vector-effect="non-scaling-stroke".

const W = 1000; // largeur logique
const H = 260; // hauteur logique
const PAD_T = 24; // marge haute (pour le point/halo)
const PAD_B = 16; // marge basse

// Lissage Catmull-Rom → Bézier : une courbe douce plutôt que des segments
// cassés. tension modérée pour rester fidèle aux données.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function AreaChart({
  data,
  unit = "count",
  locale = "fr-FR",
}: {
  data: BarDatum[];
  unit?: "currency" | "count";
  locale?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const format = (v: number) =>
    unit === "currency"
      ? (v / 100).toLocaleString(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: v % 100 === 0 ? 0 : 2,
        })
      : String(v);

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const innerH = H - PAD_T - PAD_B;

  const pts = data.map((d, i) => ({
    x: n === 1 ? W / 2 : (i / (n - 1)) * W,
    y: PAD_T + innerH - (d.value / max) * innerH,
  }));

  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  // Survol/tactile : index le plus proche du pointeur (ratio horizontal).
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (n - 1)));
  }

  const activeIdx = active ?? n - 1;
  const activePt = pts[activeIdx];
  const activeLeftPct = (activePt.x / W) * 100;

  return (
    <div
      ref={wrapRef}
      className="relative w-full touch-none"
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBFF03" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#CBFF03" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lignes de repère horizontales (4 niveaux) */}
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1="0"
            x2={W}
            y1={PAD_T + innerH * r}
            y2={PAD_T + innerH * r}
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="text-border"
          />
        ))}

        {/* Aire dégradée */}
        <path d={area} fill={`url(#fill-${gid})`} className="chart-fill" />

        {/* Ligne lissée, halo lumineux + tracé animé */}
        <path
          d={line}
          fill="none"
          stroke="#CBFF03"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className="chart-line"
          style={{ filter: "drop-shadow(0 0 6px rgba(203,255,3,0.45))" }}
        />

        {/* Repère vertical au survol */}
        <line
          x1={activePt.x}
          x2={activePt.x}
          y1={PAD_T - 8}
          y2={H}
          stroke="#CBFF03"
          strokeWidth="1"
          strokeOpacity="0.35"
          vectorEffect="non-scaling-stroke"
        />
        {/* Point actif */}
        <circle
          cx={activePt.x}
          cy={activePt.y}
          r="4.5"
          fill="#CBFF03"
          vectorEffect="non-scaling-stroke"
          className={active === null ? "chart-dot" : undefined}
          style={{ filter: "drop-shadow(0 0 5px rgba(203,255,3,0.8))" }}
        />
      </svg>

      {/* Info-bulle (HTML : nette, non étirée par le viewBox) */}
      <div
        className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-1"
        style={{ left: `${activeLeftPct}%` }}
      >
        <div className="whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-center shadow-lg">
          <div className="text-xs font-bold text-text-base">
            {format(data[activeIdx].value)}
          </div>
          <div className="text-[10px] text-text-dim">{data[activeIdx].label}</div>
        </div>
      </div>

      {/* Axe X : premier, milieu, dernier (évite le fouillis sur 24 points) */}
      <div className="mt-1.5 flex justify-between px-1 text-[10px] text-text-dim">
        <span>{data[0].label}</span>
        {n > 2 && <span>{data[Math.floor((n - 1) / 2)].label}</span>}
        <span>{data[n - 1].label}</span>
      </div>
    </div>
  );
}
