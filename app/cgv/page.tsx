import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CGV · Madger",
  description: "Conditions Générales de Vente de Madger.",
};

export default function CGV() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
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
          Conditions Générales de Vente
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "#9A9A9A", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Vendeur</h2>
            <p>
              <strong className="text-white">Léonard Bondeau</strong>, Madger<br />
              SIRET : 933 449 365 00016<br />
              TVA non applicable, art. 293 B du CGI<br />
              Email : <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Offres et tarifs</h2>
            <p>Madger propose deux formules :</p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li><strong className="text-white">Plan Free</strong> : gratuit, 5 % de commission par séance encaissée</li>
              <li><strong className="text-white">Plan Pro</strong> : 49 € / mois ou 490 € / an, 0 % de commission</li>
            </ul>
            <p className="mt-3">
              Les membres inscrits en accès anticipé bénéficient du plan Pro offert pendant 3 mois au lancement.
              Madger se réserve le droit de modifier ses tarifs avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Paiement et résiliation</h2>
            <p>
              Les paiements sont traités par <strong className="text-white">Stripe</strong> (PCI-DSS niveau 1).
              L'abonnement mensuel est sans engagement et résiliable à tout moment depuis votre espace
              ou via <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
              La résiliation prend effet à la fin de la période en cours, sans remboursement au prorata.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Rétractation</h2>
            <p>
              Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation
              de 14 jours ne s'applique pas aux services numériques à exécution immédiate,
              dès lors que vous avez expressément consenti au début de l'exécution.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Litiges</h2>
            <p>
              En cas de litige, une solution amiable sera recherchée en priorité.
              Conformément à l'article L.612-1 du Code de la consommation, vous pouvez
              recourir gratuitement à un médiateur de la consommation.
              Les présentes CGV sont régies par le droit français.
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
