import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CGU · Madger",
  description: "Conditions Générales d'Utilisation de Madger.",
};

export default function CGU() {
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
          Conditions Générales d'Utilisation
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Service</h2>
            <p>
              Madger est une plateforme SaaS de réservation et paiement pour coachs indépendants,
              éditée par Léonard Bondeau (SIRET : 933 449 365 00016).
              L'accès au service implique l'acceptation des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Utilisation</h2>
            <p>
              Le service est réservé aux professionnels majeurs exerçant une activité de coaching.
              L'utilisateur est seul responsable des prestations proposées à ses clients et de
              la déclaration de ses revenus aux organismes compétents.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Responsabilité</h2>
            <p>
              Madger agit en tant que prestataire technique et n'intervient pas dans la relation
              entre le coach et ses clients. Madger ne garantit pas un niveau de revenus ou de résultats.
              Des interruptions ponctuelles peuvent survenir pour maintenance.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Résiliation et droit applicable</h2>
            <p>
              L'utilisateur peut résilier son compte à tout moment via{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
              Les présentes CGU sont soumises au droit français.
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
