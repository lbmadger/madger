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

// Empilement de cartes-formulaire (réglages, abonnement, disponibilités).
export function FormPageSkeleton({
  blocks = 3,
  width = "max-w-2xl",
}: {
  blocks?: number;
  width?: string;
}) {
  return (
    <>
      <TopbarSkeleton />
      <main className={`mx-auto w-full ${width} flex-1 px-4 py-6 sm:px-6 sm:py-8`}>
        {Array.from({ length: blocks }).map((_, i) => (
          <div
            key={i}
            className="mb-5 animate-pulse rounded-2xl border border-border bg-bg-card p-5 sm:p-6"
          >
            <div className="h-4 w-40 rounded bg-bg-elevated" />
            <div className="mt-3 h-3 w-2/3 rounded bg-bg-elevated" />
            <div className="mt-5 h-11 w-full rounded-xl bg-bg-elevated" />
            <div className="mt-3 h-11 w-full rounded-xl bg-bg-elevated" />
          </div>
        ))}
      </main>
    </>
  );
}

// KPI en tête puis grands graphiques (statistiques).
export function ChartsPageSkeleton() {
  return (
    <>
      <TopbarSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 animate-pulse px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-border bg-bg-card"
            />
          ))}
        </div>
        <div className="mt-5 h-72 rounded-2xl border border-border bg-bg-card" />
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl border border-border bg-bg-card" />
          <div className="h-64 rounded-2xl border border-border bg-bg-card" />
        </div>
      </main>
    </>
  );
}
