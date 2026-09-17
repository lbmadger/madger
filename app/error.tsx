"use client";

import Link from "next/link";
import { useEffect } from "react";
import Leo from "@/components/ui/Leo";

// Erreur inattendue : jamais une page blanche. Deux sorties (réessayer,
// accueil) et une adresse pour écrire, l'erreur est tracée côté Vercel.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error?.digest ?? "", error?.message ?? error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-white">
      <Leo pose="point" size={120} className="mb-2" />
      <p className="mb-3 text-xl font-bold">Un problème est survenu</p>
      <p className="mb-8 max-w-sm" style={{ color: "#757575" }}>
        Ce n&apos;est pas toi, c&apos;est nous. Réessaie dans un instant. Si ça se
        reproduit, écris-nous, on regarde tout de suite.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black"
          style={{ background: "#CBFF03" }}
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/30"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
      <a
        href="mailto:contact@madger.app?subject=Erreur%20sur%20madger.app"
        className="mt-8 text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
      >
        contact@madger.app
      </a>
    </main>
  );
}
