import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/charte-paiement" },
  title: "Charte de paiement & annulation · Madger",
  description:
    "Comment Madger sécurise les paiements : séquestre, délais de versement, formules d'annulation et résolution des litiges.",
};

// Charte de paiement — page statique (FR), même style que les pages légales.
// Décrit précisément les droits du client et du coach : séquestre des fonds,
// libération, formules d'annulation, signalement et résolution des litiges.
export default function ChartePaiement() {
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
          className="font-extrabold text-white mb-4"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
        >
          Charte de paiement & annulation
        </h1>
        <p className="mb-10" style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Cette charte définit les droits du client et du coach sur les séances
          payées via Madger. Elle complète les CGV.
        </p>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              1. Principe : paiement sécurisé (séquestre)
            </h2>
            <p>
              Quand un client règle une séance sur Madger, l'argent n'est{" "}
              <strong className="text-white">pas versé immédiatement</strong> au
              coach : les fonds sont conservés par notre prestataire de paiement
              agréé Stripe jusqu&apos;à leur libération. Ils sont{" "}
              <strong className="text-white">
                libérés automatiquement au coach 24 heures après la fin de la
                séance
              </strong>
              , sauf annulation ou signalement d'un problème par le client dans ce
              délai.
            </p>
            <p className="mt-3">
              <strong className="text-white">Réservation avec validation du coach</strong> :
              lorsque le coach valide chaque demande à la main, la carte du client
              est simplement <strong className="text-white">pré-autorisée (empreinte
              bancaire)</strong> au moment de la demande. Aucun débit n'a lieu tant
              que le coach n'a pas accepté. S'il refuse, ou sans réponse de sa part
              sous 6 jours, l'empreinte est levée et rien n'est prélevé. Une fois la
              demande acceptée, le paiement est débité et suit le circuit de
              séquestre décrit ci-dessus.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              2. Formules d'annulation
            </h2>
            <p>
              Chaque coach définit lui-même{" "}
              <strong className="text-white">deux pourcentages de
              remboursement</strong>, affichés sur sa page publique et au moment
              de la réservation, avant tout paiement. Ces règles s'appliquent
              lorsqu'un <strong className="text-white">client</strong> annule :
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Le client annule plus de 24 heures
                avant le début de la séance</strong> (la veille ou avant) : il est
                remboursé du pourcentage choisi par le coach pour ce cas.
              </li>
              <li>
                <strong className="text-white">Le client annule moins de 24 heures
                avant le début de la séance</strong> (le jour même) : il est
                remboursé du pourcentage, généralement plus bas, choisi par le
                coach pour ce cas.
              </li>
              <li>
                <strong className="text-white">Absence à la séance (no-show)</strong> :
                0 % remboursé.
              </li>
            </ul>
            <p className="mt-3">
              La part non remboursée revient au coach (moins frais et
              commission).
            </p>
            <p className="mt-3">
              Si c'est le <strong className="text-white">coach</strong> qui annule
              la séance, le client est remboursé à{" "}
              <strong className="text-white">100 %</strong>, quelle que soit la
              formule.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              3. Signaler un problème
            </h2>
            <p>
              Tant que les fonds ne sont pas libérés (soit dans les 24 h suivant la
              séance), le client peut{" "}
              <strong className="text-white">signaler un problème</strong> depuis
              sa réservation. Les fonds sont alors{" "}
              <strong className="text-white">gelés</strong> et ne sont plus versés
              automatiquement, le temps qu'une décision soit prise.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              4. Résolution des litiges : dans quels cas
            </h2>
            <p>
              En cas de signalement, Madger examine la situation et tranche selon
              les principes suivants :
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Séance non assurée</strong> par le
                coach (coach absent, séance non délivrée) : remboursement intégral
                du client.
              </li>
              <li>
                <strong className="text-white">Séance manifestement non conforme</strong>{" "}
                à la prestation annoncée (durée, contenu, lieu) : remboursement
                total ou partiel selon les éléments fournis.
              </li>
              <li>
                <strong className="text-white">Séance correctement assurée</strong>{" "}
                : la séance a eu lieu comme convenu : versement au coach, pas de
                remboursement.
              </li>
              <li>
                <strong className="text-white">Absence d'éléments</strong> ou
                signalement non justifié : les fonds sont versés au coach.
              </li>
            </ul>
            <p className="mt-3">
              Chaque partie peut fournir des éléments (échanges, preuves). La
              décision de Madger est prise de bonne foi et vise à protéger aussi
              bien le client que le coach contre les abus.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              5. Frais et commissions
            </h2>
            <p>
              Sur chaque séance payée, les{" "}
              <strong className="text-white">frais de traitement Stripe</strong>{" "}
              sont à la charge du coach. La{" "}
              <strong className="text-white">commission Madger</strong> est de 0 %
              pour un coach Pro et de 5 % pour un coach Madger Basic,
              prélevée sur la part effectivement conservée par le coach.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              6. Délais
            </h2>
            <p>
              Les versements et remboursements sont exécutés via Stripe. Un
              remboursement peut prendre plusieurs jours ouvrés pour apparaître sur
              le compte du client, selon sa banque.
            </p>
          </section>

          <section>
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Pour toute question :{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>
                contact@madger.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
