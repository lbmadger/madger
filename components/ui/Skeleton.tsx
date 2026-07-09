// Squelettes de chargement réutilisables : la page ne reste jamais blanche
// pendant les requêtes serveur, on voit sa structure arriver. Neutralisé par
// prefers-reduced-motion (règle globale sur animate-pulse).

// Barre de titre factice (remplace le Topbar de la page pendant le chargement).
function TopbarSkeleton() {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mx-auto h-6 w-40 max-w-full animate-pulse rounded-lg bg-bg-card" />
    </div>
  );
}

// Liste de lignes (clients, messages, factures, paiements…).
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <TopbarSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 h-9 w-40 animate-pulse rounded-full bg-bg-card" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-bg-card"
            />
          ))}
        </div>
      </main>
    </>
  );
}

// Grille de cartes (prestations).
export function GridPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <>
      <TopbarSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 h-9 w-40 animate-pulse rounded-full bg-bg-card" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-border bg-bg-card"
            />
          ))}
        </div>
      </main>
    </>
  );
}
