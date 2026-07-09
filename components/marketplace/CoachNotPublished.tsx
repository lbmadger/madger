import Link from "next/link";

// Affiché au COACH lui-même quand il ouvre sa page publique alors qu'elle
// n'est pas encore publiée : au lieu d'un 404 muet, on lui dit exactement ce
// qui manque pour apparaître dans l'annuaire, avec un lien pour corriger.
export default function CoachNotPublished({
  firstName,
  checks,
}: {
  firstName: string | null;
  // Chaque critère : done + libellé + lien de correction.
  checks: { done: boolean; label: string; href: string }[];
}) {
  const missing = checks.filter((c) => !c.done);
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="mx-auto max-w-lg px-6 py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/[0.08] px-3.5 py-1.5 text-xs font-medium text-warning">
          Profil pas encore publié
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {firstName ? `${firstName}, ta` : "Ta"} page publique n&apos;est pas
          encore visible
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Elle apparaîtra automatiquement dans l&apos;annuaire dès que ces
          {missing.length > 1 ? " points" : " point"} seront complétés :
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-3 transition-colors hover:border-border-strong"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    c.done
                      ? "border-accent bg-accent text-black"
                      : "border-border-strong text-text-dim"
                  }`}
                >
                  {c.done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    c.done ? "text-text-dim line-through" : "text-text-base"
                  }`}
                >
                  {c.label}
                </span>
                {!c.done && (
                  <svg className="shrink-0 text-text-dim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
