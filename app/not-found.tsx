import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable · Madger",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg text-white flex flex-col items-center justify-center px-6">
      <p className="font-extrabold mb-4" style={{ fontSize: "clamp(64px, 12vw, 120px)", color: "#CBFF03", lineHeight: 1 }}>
        404
      </p>
      <p className="text-white font-bold text-xl mb-3">Page introuvable</p>
      <p className="mb-10" style={{ color: "#5A5A5A" }}>Cette page n'existe pas ou a été déplacée.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-black"
        style={{ background: "#CBFF03" }}
      >
        Retour à l'accueil
      </Link>
    </main>
  );
}
