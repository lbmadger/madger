import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/cgv" },
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
          Conditions Générales de Vente
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>

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
              <li><strong className="text-white">Plan Gratuit</strong> : 0 €, 5 % de commission par séance encaissée</li>
              <li><strong className="text-white">Plan Pro</strong> : 49 € / mois ou 490 € / an, 0 % de commission</li>
            </ul>
            <p className="mt-3">
              Tous les prix sont affichés toutes taxes comprises (TVA non applicable, art. 293 B du CGI).
              Les prestations des coachs sont affichées au prix fixé par chaque coach, toutes taxes comprises.
              Les membres inscrits en accès anticipé bénéficient du plan Pro offert pendant 3 mois au lancement.
              Madger se réserve le droit de modifier ses tarifs avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Commande</h2>
            <p>
              La souscription d&apos;un abonnement ou la réservation d&apos;une séance suit un processus
              en deux étapes : un récapitulatif présente le détail de la commande et son prix total,
              puis le paiement est confirmé par un second clic sur la page de paiement sécurisée Stripe.
              Vous pouvez vérifier et corriger votre commande avant de la valider.
              Une confirmation est envoyée par email après le paiement.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Fonctionnement de la plateforme</h2>
            <p>
              Madger met en relation des coachs sportifs professionnels et des clients
              (art. L.111-7 du Code de la consommation). Les coachs référencés sont des
              professionnels indépendants, seuls responsables de leurs prestations. Sur la page
              de recherche, les coachs sont classés par date d&apos;inscription et par complétude
              de leur profil ; aucun classement n&apos;est vendu ni sponsorisé. Madger agit comme
              intermédiaire technique : les paiements des séances sont encaissés par notre
              prestataire de paiement agréé Stripe puis reversés au coach selon la charte de paiement.
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
            <p className="mt-3">
              Pour la réservation d&apos;une séance de coaching, le droit de rétractation ne
              s&apos;applique pas non plus : il s&apos;agit d&apos;une activité de loisirs fournie
              à une date déterminée (art. L.221-28 12° du Code de la consommation).
              Les conditions d&apos;annulation et de remboursement applicables sont celles de la{" "}
              <Link href="/charte-paiement" style={{ color: "#CBFF03" }}>charte de paiement</Link>,
              affichées avant tout paiement.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Médiation et litiges</h2>
            <p>
              En cas de litige, une solution amiable sera recherchée en priorité : écrivez-nous
              à <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
              Conformément aux articles L.612-1 et suivants du Code de la consommation, vous pouvez
              recourir gratuitement au médiateur de la consommation dont nous relevons :
            </p>
            <p className="mt-3">
              <strong className="text-white">CM2C, Centre de médiation de la consommation de conciliateurs de justice</strong><br />
              49 rue de Ponthieu, 75008 Paris<br />
              <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>cm2c.net</a>
            </p>
            <p className="mt-3">
              Vous pouvez également utiliser la plateforme européenne de règlement en ligne des
              litiges : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>ec.europa.eu/consumers/odr</a>.
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
