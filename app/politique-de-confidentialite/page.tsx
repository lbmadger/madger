import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Madger",
  description: "Politique de confidentialité de Madger. Comment nous collectons et utilisons vos données personnelles.",
};

export default function PolitiqueConfidentialite() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-12 transition-colors duration-200"
          style={{ color: "#5A5A5A" }}
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
          Politique de confidentialité
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "#9A9A9A", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Responsable du traitement</h2>
            <p>
              Léonard Bondeau, Madger · <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Données collectées et finalité</h2>
            <p>
              Les données collectées via le formulaire d'accès anticipé (prénom, nom, email, téléphone, type de coaching)
              sont utilisées uniquement pour vous recontacter dans le cadre de l'accès à Madger.
              Elles ne sont jamais revendues ni partagées à des fins commerciales.
            </p>
            <p className="mt-3">
              Base légale : consentement (article 6.1.a du RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Conservation</h2>
            <p>
              Vos données sont conservées 3 ans à compter de votre inscription, puis supprimées ou anonymisées.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression
              et d'opposition sur vos données. Pour l'exercer, écrivez à{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
            </p>
            <p className="mt-3">
              En cas de litige, vous pouvez saisir la{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>CNIL</a>.
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
