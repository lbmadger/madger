import Link from "next/link";
import type { Metadata } from "next";
import { installmentFeeLabel } from "@/lib/stripe/installments";

const INSTALLMENT_FEE_LABEL = installmentFeeLabel("fr");

export const metadata: Metadata = {
  alternates: { canonical: "/charte-paiement" },
  title: "Madger · Charte de paiement & annulation",
  description:
    "Comment Madger sécurise les paiements : séquestre, délais de versement, formules d'annulation, packs de séances et résolution des litiges.",
};

// Charte de paiement : page statique (FR), même style que les pages légales.
// Décrit précisément les droits du client et du coach : séquestre des fonds,
// libération, délais d'annulation, packs de séances, signalement et
// résolution des litiges. Doit rester alignée sur le code (routes
// d'annulation, cron de versement, fonctions SQL des crédits).
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
          et les packs payés via Madger. Elle complète les CGV.
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
              délai. Le coach reçoit ensuite ses fonds sur son compte bancaire par
              virement hebdomadaire.
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
            <p className="mt-3">
              <strong className="text-white">Pack de séances</strong> : un pack est
              toujours débité au moment de l'achat, y compris chez un coach qui
              valide ses demandes à la main. Seule la première séance, choisie à
              l'achat, reste à valider. Si le coach la refuse, le pack est
              intégralement remboursé. Les fonds d'un pack sont libérés au coach
              séance par séance, 24 heures après chaque séance effectuée, le reste
              demeurant sous séquestre. À l'expiration du pack, ou au plus tard 180
              jours après l'achat, le solde est versé au coach.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              2. Annulation d'une séance à l'unité
            </h2>
            <p>
              Le client peut toujours annuler une séance depuis son espace,
              quel que soit le plan du coach ; seule la conséquence financière
              dépend des règles du coach, affichées sur sa page publique et au
              moment de la réservation, avant tout paiement.
            </p>
            <p className="mt-3">
              <strong className="text-white">Coach Essentiel</strong> : règle
              fixe, non modifiable. Annulation plus de 24 heures avant la
              séance : remboursement intégral. Annulation à moins de 24 heures :
              aucun remboursement, le montant reste acquis au coach. Le coach
              peut toujours, de sa propre initiative, rembourser tout ou partie
              d'une séance depuis la fiche du client (geste commercial), quel
              que soit son plan.
            </p>
            <p className="mt-3">
              <strong className="text-white">Coach Pro</strong> : le coach
              définit lui-même{" "}
              <strong className="text-white">un délai d'annulation</strong> (12, 24
              ou 48 heures avant le début de la séance) et{" "}
              <strong className="text-white">deux pourcentages de
              remboursement</strong>. Ces règles s'appliquent automatiquement,
              sans intervention du coach, lorsqu'un{" "}
              <strong className="text-white">client</strong> annule :
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Le client annule avant le délai
                du coach</strong> : il est remboursé du pourcentage choisi par le
                coach pour ce cas.
              </li>
              <li>
                <strong className="text-white">Le client annule après ce délai</strong> :
                il est remboursé du pourcentage, généralement plus bas, choisi par
                le coach pour ce cas.
              </li>
              <li>
                <strong className="text-white">Absence à la séance (no-show)</strong> :
                0 % remboursé.
              </li>
            </ul>
            <p className="mt-3">
              La part non remboursée revient au coach, déduction faite des
              frais de transaction Madger. Tout remboursement donne lieu à un
              avoir envoyé au client par email.
            </p>
            <p className="mt-3">
              Si c'est le <strong className="text-white">coach</strong> qui annule
              la séance, le client est remboursé à{" "}
              <strong className="text-white">100 %</strong>, quelle que soit la
              formule.
            </p>
            <p className="mt-3">
              <strong className="text-white">Séance déplacée par le coach</strong> :
              le client est prévenu par email et peut, depuis son espace, confirmer
              le nouvel horaire ou en choisir un autre parmi les créneaux du coach.
              Sans réponse de sa part sous 48 heures (ou 12 heures avant la séance
              si c'est plus tôt), le nouvel horaire est considéré comme accepté.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              3. Packs de séances : crédits et annulation
            </h2>
            <p>
              L'achat d'un pack donne au client un nombre de{" "}
              <strong className="text-white">crédits</strong> égal au nombre de
              séances du pack, utilisables uniquement auprès du coach qui l'a
              vendu. Le client place ses séances depuis son espace, dans les
              créneaux du coach. Un crédit n'est jamais négatif : sans crédit
              restant, le client reprend un pack ou réserve à l'unité.
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Validité</strong> : le coach fixe la
                durée de validité du pack (de 1 à 12 mois, ou sans limite),
                affichée avant l'achat. À l'échéance, les séances non utilisées
                sont perdues. Le client est prévenu par email 7 jours avant.
              </li>
              <li>
                <strong className="text-white">Annulation d'une séance du pack</strong> :
                le coach fixe pour chaque pack un délai d'annulation (12, 24 ou 48
                heures). Une séance annulée par le client avant ce délai est
                remise sur son solde. Une séance annulée après ce délai, ou non
                honorée, est décomptée comme si elle avait eu lieu. Une séance
                annulée par le coach est toujours remise sur le solde.
              </li>
              <li>
                <strong className="text-white">Remboursement</strong> : les
                séances déjà effectuées ou décomptées ne sont pas remboursables.
                Le coach peut à tout moment rembourser les séances restantes d'un
                pack, au prorata du prix payé ; le pack est alors clôturé et un
                avoir est émis. Le client dispose en outre du droit de
                rétractation décrit dans les CGV.
              </li>
              <li>
                <strong className="text-white">Gestes commerciaux</strong> : le
                coach peut offrir ou retirer des séances sur un pack. Chaque
                mouvement de crédit est journalisé et visible du coach.
              </li>
              <li>
                <strong className="text-white">Modification d'une offre</strong> :
                les conditions d'un pack (prix, validité, délai) sont figées à
                l'achat. Modifier l'offre ensuite ne change rien aux packs déjà
                achetés.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              4. Signaler un problème
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
              5. Résolution des litiges : dans quels cas
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
              6. Frais de transaction
            </h2>
            <p>
              Sur chaque séance, pack ou échéance d'abonnement payé, Madger
              prélève des{" "}
              <strong className="text-white">frais de transaction, tout compris</strong>,
              sur la part effectivement conservée par le coach : 7 % pour un
              coach Essentiel, 3 % pour un coach Pro. Les frais de traitement
              du paiement par carte sont inclus dans ce taux et supportés par
              Madger. Le taux applicable est celui du plan du coach au moment
              du paiement ; il reste attaché à ce paiement même si le coach
              change de plan ensuite.
            </p>
            <p className="mt-3">
              <strong className="text-white">Paiement en plusieurs fois</strong> :
              lorsque le coach l'a activé, un pack de 120 € ou plus peut être réglé
              en trois fois via Klarna ou Alma. Les frais de ce mode de paiement
              (grille Stripe en vigueur, {INSTALLMENT_FEE_LABEL} par transaction)
              sont à la charge du coach qui a activé l'option et déduits de son
              versement, en plus des frais de transaction Madger. Le coach reçoit
              le solde selon le circuit de séquestre habituel ; l'échéancier
              relève du contrat entre le client et l'organisme choisi, qui
              applique ses propres conditions. Les remboursements repartent vers
              ce même organisme.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>
              7. Délais
            </h2>
            <p>
              Les versements et remboursements sont exécutés via Stripe. Un
              remboursement repart toujours vers le moyen de paiement d'origine et
              peut prendre plusieurs jours ouvrés pour apparaître sur le compte du
              client, selon sa banque.
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
            <p style={{ fontSize: 13, color: "#3A3A3A", marginTop: 8 }}>
              Dernière mise à jour : septembre 2026, version 2026-09c
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
