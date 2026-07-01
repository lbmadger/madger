import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
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
          style={{ color: "#5A5A5A" }}
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
        <p className="mb-10" style={{ color: "#5A5A5A", fontSize: 14 }}>
          Cette charte définit les droits du client et du coach sur les séances
          payées via Madger. Elle complète les CGV.
        </p>

        <div className="flex flex-col gap-10" style={{ color: "#9A9A9A", fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              1. Principe : paiement sécurisé (séquestre)
            </h2>
            <p>
              Quand un client règle une séance sur Madger, l'argent n'est{" "}
              <strong className="text-white">pas versé immédiatement</strong> au
              coach : il est retenu par Madger. Les fonds sont{" "}
              <strong className="text-white">
                libérés automatiquement au coach 24 heures après la fin de la
                séance
              </strong>
              , sauf annulation ou signalement d'un problème par le client dans ce
              délai.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              2. Formules d'annulation
            </h2>
            <p>
              Chaque coach choisit une formule, affichée sur sa page publique et
              au moment de la réservation. Le pourcentage indiqué est{" "}
              <strong className="text-white">remboursé au client</strong> ; le
              reste revient au coach (moins frais et commission). Ces règles
              s'appliquent lorsqu'un <strong className="text-white">client</strong>{" "}
              annule.
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Flexible</strong> — annulation
                +24 h avant : 100 % remboursé ; -24 h : 50 % ; absence : 0 %.
              </li>
              <li>
                <strong className="text-white">Modérée</strong> — annulation
                +24 h avant : 75 % remboursé ; -24 h : 0 % ; absence : 0 %.
              </li>
              <li>
                <strong className="text-white">Stricte</strong> — annulation
                +48 h avant : 50 % remboursé ; -48 h : 0 % ; absence : 0 %.
              </li>
            </ul>
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
              4. Résolution des litiges — dans quels cas
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
              pour un coach Pro et de 5 % pour un coach sur le plan gratuit,
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
            <p style={{ color: "#5A5A5A", fontSize: 13 }}>
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
