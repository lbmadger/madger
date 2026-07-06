// Squelette de la marketplace : structure visible pendant le chargement.
export default function CoachsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl animate-pulse px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto h-6 w-64 rounded-full bg-bg-card" />
      <div className="mx-auto mt-4 h-10 w-3/4 max-w-xl rounded-lg bg-bg-card" />
      <div className="mx-auto mt-3 h-4 w-1/2 max-w-md rounded bg-bg-card" />
      <div className="mx-auto mt-8 h-11 w-40 rounded-full bg-bg-card" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border bg-bg-card"
          >
            <div className="aspect-[4/3] w-full bg-bg-elevated" />
            <div className="p-4">
              <div className="h-4 w-2/3 rounded bg-bg-elevated" />
              <div className="mt-2 h-3 w-1/2 rounded bg-bg-elevated" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
