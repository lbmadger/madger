import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Madger",
  description: "Politique de confidentialité de Madger. Comment nous collectons et utilisons vos données personnelles.",
};

// Couvre les traitements RÉELS du produit (comptes, réservations, paiements,
// messagerie, données de forme), pas seulement le formulaire d'accès anticipé.
export default function PolitiqueConfidentialite() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Back */}
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
          Politique de confidentialité
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Responsable du traitement</h2>
            <p>
              Léonard Bondeau, Madger · <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Données traitées et finalités</h2>
            <ul className="mt-1 flex flex-col gap-3" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>
                <strong className="text-white">Compte et profil</strong> (email, mot de passe chiffré, prénom, nom,
                téléphone, photo pour les coachs, SIRET et mentions de facturation pour les coachs) :
                création et gestion de votre compte, affichage du profil public du coach, factures conformes.
                Base légale : exécution du contrat (art. 6.1.b du RGPD).
              </li>
              <li>
                <strong className="text-white">Réservations et paiements</strong> (séances réservées, montants,
                statuts de paiement et de remboursement) : prise de rendez-vous, encaissement sécurisé,
                versement au coach, facturation, gestion des annulations et litiges.
                Base légale : exécution du contrat, puis obligation légale pour la conservation comptable.
              </li>
              <li>
                <strong className="text-white">Messagerie</strong> (messages échangés entre client et coach) :
                mise en relation et suivi du coaching. Base légale : exécution du contrat.
              </li>
              <li>
                <strong className="text-white">Données de forme</strong> renseignées volontairement par le client
                dans son profil sportif (date de naissance, taille, poids, objectifs, niveau, note libre) :
                personnalisation de l&apos;accompagnement par le coach choisi. Ces données peuvent relever des
                données de santé (art. 9 du RGPD) : elles ne sont traitées qu&apos;avec votre
                <strong className="text-white"> consentement explicite</strong>, sont facultatives, visibles
                uniquement de votre coach, et supprimables à tout moment depuis votre profil.
              </li>
              <li>
                <strong className="text-white">Agenda Google du coach</strong> (si le coach connecte son compte) :
                création des événements de séance et des liens Google Meet. Base légale : consentement,
                révocable à tout moment depuis les réglages.
              </li>
              <li>
                <strong className="text-white">Formulaire d&apos;accès anticipé</strong> (prénom, nom, email,
                téléphone, activité) : recontact dans le cadre du lancement. Base légale : consentement.
              </li>
            </ul>
            <p className="mt-3">
              Vos données ne sont jamais revendues ni partagées à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Sous-traitants</h2>
            <p>
              Pour fournir le service, nous faisons appel aux sous-traitants suivants, qui traitent
              vos données pour notre compte :
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li><strong className="text-white">Supabase</strong> : base de données et authentification (hébergement dans l&apos;Union européenne)</li>
              <li><strong className="text-white">Stripe</strong> : paiements, empreintes bancaires et versements aux coachs (certifié PCI-DSS niveau 1 ; Madger ne stocke jamais vos numéros de carte)</li>
              <li><strong className="text-white">Google</strong> : agenda et visioconférence, uniquement pour les coachs qui connectent leur compte Google</li>
              <li><strong className="text-white">Vercel</strong> (États-Unis) : hébergement du site et mesure d&apos;audience sans cookies</li>
              <li><strong className="text-white">Resend</strong> : envoi des emails transactionnels (confirmations, rappels, factures)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Conservation</h2>
            <ul className="mt-1 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>Compte et profil : tant que le compte est actif, puis supprimés à la clôture.</li>
              <li>Pièces comptables (paiements, factures) : 10 ans, conformément au Code de commerce.</li>
              <li>Données de forme : supprimées avec le compte, ou à votre demande à tout moment.</li>
              <li>Formulaire d&apos;accès anticipé : 3 ans à compter de l&apos;inscription, puis suppression ou anonymisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression,
              de portabilité et d&apos;opposition sur vos données, ainsi que du droit de retirer votre
              consentement à tout moment (notamment pour les données de forme et la connexion Google).
              Pour l&apos;exercer, écrivez à{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
            </p>
            <p className="mt-3">
              En cas de litige, vous pouvez saisir la{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>CNIL</a>.
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
