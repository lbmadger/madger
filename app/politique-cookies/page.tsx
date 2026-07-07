import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies · Madger",
  description: "Politique de cookies de Madger.",
};

export default function PolitiqueCookies() {
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
          className="font-extrabold text-white mb-10"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
        >
          Cookies
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <p>
              Madger n'utilise pas de cookies de traçage publicitaire ni d'outils d'analyse tiers
              (Google Analytics, Meta Pixel, etc.).
            </p>
            <p className="mt-3">
              Seuls des cookies techniques strictement nécessaires au fonctionnement sont déposés :
              le cookie de <strong className="text-white">session Supabase</strong> (authentification,
              durée de la session, indispensable pour rester connecté), le cookie de{" "}
              <strong className="text-white">langue</strong> (madger_locale, 12 mois) et, pendant la
              phase d'accès anticipé, le cookie du <strong className="text-white">code d'accès</strong>.
              Ces cookies ne nécessitent pas de consentement préalable conformément aux
              recommandations de la CNIL.
            </p>
            <p className="mt-3">
              Les pages de paiement utilisent des cookies <strong className="text-white">Stripe</strong> à des
              fins de sécurisation des transactions.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Gérer les cookies</h2>
            <p>
              Vous pouvez supprimer ou bloquer les cookies depuis les paramètres de votre navigateur.
              Pour toute question : <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <p style={{ fontSize: 13, color: "#3A3A3A", marginTop: 8 }}>
            Dernière mise à jour : juin 2026
          </p>
        </div>
      </div>
    </main>
  );
}
