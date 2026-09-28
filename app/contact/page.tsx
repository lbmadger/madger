import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Madger · Nous écrire",
  description: "Une question sur Madger ? Écris-nous, un humain te répond.",
};

// Page contact : l'adresse qu'un visiteur tape spontanément. Une adresse
// email et Instagram, rien d'autre : un humain répond.
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-12 transition-colors duration-200"
          style={{ color: "var(--text-dim)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </Link>

        <h1
          className="font-extrabold text-white mb-6"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
        >
          Nous écrire
        </h1>
        <p className="text-text-muted text-lg mb-10" style={{ lineHeight: 1.6 }}>
          Une question, un bug, une idée ? Écris-nous, un humain te répond.
        </p>

        <div className="flex flex-col gap-4">
          <a
            href="mailto:contact@madger.app"
            className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors duration-200"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#8C8C8C" }}>
                Email
              </span>
              <span className="block font-semibold text-white mt-1">contact@madger.app</span>
            </span>
            <span style={{ color: "#CBFF03" }}>→</span>
          </a>
          <a
            href="https://www.instagram.com/madger.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors duration-200"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#8C8C8C" }}>
                Instagram
              </span>
              <span className="block font-semibold text-white mt-1">@madger.app</span>
            </span>
            <span style={{ color: "#CBFF03" }}>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
