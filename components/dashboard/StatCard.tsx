// Carte statistique du dashboard. Composant serveur pur (aucune interaction)
// pour rester léger. Le `trend` optionnel affichera l'évolution en Phase 3.

export default function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-base sm:text-3xl">
          {value}
        </span>
        {trend && <span className="text-xs font-medium text-accent">{trend}</span>}
      </div>
    </div>
  );
}
