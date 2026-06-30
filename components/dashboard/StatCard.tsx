// Carte statistique du dashboard. Composant serveur pur. `trend` optionnel
// affiche l'évolution (+X% en vert / −X% en rouge) ; `hint` une légende.

export type Trend = { text: string; positive: boolean } | null;

export default function StatCard({
  label,
  value,
  trend = null,
  hint,
}: {
  label: string;
  value: string;
  trend?: Trend;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-base sm:text-3xl">
          {value}
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
    </div>
  );
}
