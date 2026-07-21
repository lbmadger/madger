import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/mentions-legales" },
  title: "Mentions légales · Madger",
  description: "Mentions légales de Madger.",
};

export default function MentionsLegales() {
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
          Mentions légales
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Éditeur</h2>
            <p>
              <strong className="text-white">Léonard Bondeau</strong>, Madger<br />
              SIRET : 933 449 365 00016<br />
              Adresse : Résidence du Bois de Sapin, 71400 Autun<br />
              Directeur de la publication : Léonard Bondeau<br />
              Email : <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Hébergeur</h2>
            <p>
              <strong className="text-white">Vercel Inc.</strong><br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              Téléphone : +1 559 288 7060<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>vercel.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Médiation de la consommation</h2>
            <p>
              Médiateur : <strong className="text-white">CM2C</strong>, 49 rue de Ponthieu, 75008 Paris,{" "}
              <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>cm2c.net</a>.
              Le recours au médiateur est gratuit après une première réclamation écrite
              restée sans réponse satisfaisante.
            </p>
          </section>

          <p style={{ fontSize: 13, color: "#3A3A3A", marginTop: 8 }}>
            Dernière mise à jour : juillet 2026
          </p>
        </div>
      </div>
    </main>
  );
}
