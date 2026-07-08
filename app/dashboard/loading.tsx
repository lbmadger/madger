// Squelette de chargement du dashboard : la page ne reste jamais blanche
// pendant les requêtes, on voit la structure arriver.
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 animate-pulse px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 h-8 w-64 rounded-lg bg-bg-card" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-border bg-bg-card"
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-48 rounded-2xl border border-border bg-bg-card" />
        <div className="h-48 rounded-2xl border border-border bg-bg-card" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-2xl border border-border bg-bg-card lg:col-span-2" />
        <div className="h-64 rounded-2xl border border-border bg-bg-card" />
      </div>
    </main>
  );
}
