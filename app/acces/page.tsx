"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

// Page de saisie du code d'accès pré-lancement. Une fois le bon code entré,
// le cookie est posé et l'utilisateur est redirigé vers sa destination.
function AccessForm() {
  const params = useSearchParams();
  const rawNext = params.get("next") || "/dashboard";
  // Anti open-redirect : uniquement des chemins internes.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-extrabold tracking-tight text-white">
          Madger
          <span className="ml-2 rounded-full bg-[#CBFF03] px-2 py-0.5 text-[10px] font-semibold text-black">
            bientôt
          </span>
        </p>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
          Accès privé
        </h1>
        <p className="mt-2 text-sm text-[#9a9a9a]">
          Cette partie de Madger n'est pas encore ouverte au public. Entre ton
          code d'accès pour continuer.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code d'accès"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-base text-white outline-none focus:border-[#CBFF03]"
          />
          {error && (
            <p className="text-sm text-red-400">Code incorrect. Réessaie.</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#CBFF03] px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Vérification…" : "Entrer"}
          </button>
        </form>

        <a href="/" className="mt-6 inline-block text-xs text-[#5A5A5A] hover:text-[#9a9a9a]">
          ← Retour à l'accueil
        </a>
      </div>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense>
      <AccessForm />
    </Suspense>
  );
}
