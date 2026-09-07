import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/cgv" },
  title: "Madger · CGV",
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
              <li><strong className="text-white">« Gratuit »</strong> : 0 €, 5 % de commission par séance encaissée</li>
              <li><strong className="text-white">Madger Pro</strong> : 49 € par mois ou 490 € par an, 0 % de commission</li>
            </ul>
            <p className="mt-3">
              TVA non applicable à ce jour, art. 293 B du CGI : tant que cette franchise
              s&apos;applique, aucun montant de TVA n&apos;est ajouté et le prix affiché correspond
              au prix payé. Si Madger devient redevable de la TVA, celle-ci s&apos;ajoutera au
              tarif hors taxes en vigueur. Les prestations des coachs sont affichées au prix
              fixé par chaque coach, toutes taxes comprises.
            </p>
            <p className="mt-3">
              <strong className="text-white">Prix de lancement</strong> : le tarif de 49 € par
              mois (490 € par an) est un prix de lancement valable pour tout abonnement
              souscrit jusqu&apos;au 31 décembre 2026 inclus. À compter du 1er janvier 2027, le
              tarif de Madger Pro pour les nouvelles souscriptions est de 69 € par mois
              (690 € par an). Un coach abonné avant cette date conserve le prix de lancement
              tant que son abonnement reste actif sans interruption.
            </p>
            <p className="mt-3">
              Le premier abonnement Madger Pro d&apos;un coach débute par 7 jours d&apos;essai
              gratuit, avec enregistrement d&apos;un moyen de paiement ; sauf résiliation avant la
              fin de l&apos;essai, il se poursuit automatiquement au tarif choisi. Un seul essai
              par coach. Les membres inscrits en accès anticipé bénéficient de Madger Pro
              offert pendant 1 mois au lancement. Madger se réserve le droit de modifier ses
              tarifs avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Paiement en plusieurs fois</h2>
            <p>
              Lorsque le coach l&apos;a activé, un pack de séances de 120 € ou plus peut être
              réglé en trois fois via Klarna ou Alma, proposés sur la page de paiement. Le
              choix de ce mode de paiement forme un contrat entre le client et l&apos;organisme
              concerné, qui applique ses propres conditions. Les séances à l&apos;unité se
              règlent par carte, Apple Pay, Google Pay ou Link.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Commande</h2>
            <p>
              La souscription d&apos;un abonnement ou la réservation d&apos;une séance suit un processus
              en deux étapes : un récapitulatif présente le détail de la commande et son prix total,
              puis le paiement est confirmé par un second clic sur la page de paiement sécurisée Stripe.
              Vous pouvez vérifier et corriger votre commande avant de la valider.
              En validant le paiement, vous acceptez les présentes CGV et la charte de
              paiement ; la version acceptée et la date sont conservées avec le paiement.
              Une confirmation est envoyée par email après le paiement.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Packs de séances</h2>
            <p>
              Un pack est un ensemble de séances prépayées auprès d&apos;un coach donné, sous
              forme de crédits utilisables uniquement chez ce coach, depuis l&apos;espace client.
              Le prix, la durée de validité et le délai d&apos;annulation du pack sont affichés
              avant l&apos;achat et figés à l&apos;achat. À l&apos;échéance de la validité, les séances
              non utilisées sont perdues. Le détail des règles d&apos;utilisation, d&apos;annulation
              et de remboursement figure dans la{" "}
              <Link href="/charte-paiement" style={{ color: "#CBFF03" }}>charte de paiement</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Factures</h2>
            <p>
              Chaque paiement encaissé donne lieu à une facture numérotée de façon
              continue, émise au nom du coach avec ses mentions légales et envoyée au client
              par email au format PDF. Tout remboursement donne lieu à un avoir, numéroté et
              envoyé de la même façon. Le coach retrouve l&apos;ensemble de ses factures et
              avoirs dans son espace.
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
              L&apos;abonnement Madger Pro est sans engagement et résiliable à tout moment depuis
              votre espace (Abonnement, « Gérer mon abonnement ») ou via{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
              La résiliation prend effet à la fin de la période en cours, sans remboursement au
              prorata ; jusqu&apos;à cette date, l&apos;abonnement reste actif et peut être réactivé
              en un clic. Un abonnement résilié puis souscrit à nouveau est facturé au tarif en
              vigueur à la nouvelle souscription.
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
            <p className="mt-3">
              Pour l&apos;achat d&apos;un <strong className="text-white">pack de séances</strong>, dont les
              séances ne sont pas toutes fixées à une date déterminée, le client dispose du droit
              de rétractation de 14 jours à compter de l&apos;achat. En plaçant une séance avant la
              fin de ce délai, il demande expressément l&apos;exécution anticipée du contrat : les
              séances effectuées ou décomptées avant la rétractation restent dues, et le
              remboursement porte sur les séances restantes, au prorata du prix payé. La demande
              s&apos;exerce auprès du coach ou par email à{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
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
            Dernière mise à jour : septembre 2026
          </p>
        </div>
      </div>
    </main>
  );
}
