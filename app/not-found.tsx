import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable · Madger",
};

// 404 qui ne laisse jamais l'utilisateur bloqué : deux sorties claires
// (accueil + recherche de coachs), au cas où un profil de coach non publié
// ou un ancien lien mène ici.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="font-extrabold mb-4" style={{ fontSize: "clamp(64px, 12vw, 120px)", color: "#CBFF03", lineHeight: 1 }}>
        404
      </p>
      <p className="text-white font-bold text-xl mb-3">Page introuvable</p>
      <p className="mb-10 max-w-sm" style={{ color: "#757575" }}>
        Cette page n&apos;existe pas, ou le profil que tu cherches n&apos;est pas
        encore publié. Trouve un coach disponible juste ici.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/coachs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black"
          style={{ background: "#CBFF03" }}
        >
          Trouver un coach
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm text-white/80 border border-white/15 hover:border-white/30 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
