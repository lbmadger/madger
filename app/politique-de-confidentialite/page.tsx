import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Madger",
  description: "Politique de confidentialité de Madger. Comment nous collectons, utilisons et protégeons vos données personnelles.",
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
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>1. Qui sommes-nous ?</h2>
            <p>
              Madger est une plateforme de réservation et de paiement destinée aux coachs indépendants en France.
              Le site est accessible à l'adresse <strong className="text-white">madger.app</strong>.
              Pour toute question relative à vos données, contactez-nous à{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>2. Données collectées</h2>
            <p>Nous collectons les données suivantes via notre formulaire d'accès anticipé :</p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>Prénom et nom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Type de coaching pratiqué</li>
              <li>Nombre de clients actifs</li>
              <li>Compte Instagram ou site web (optionnel)</li>
              <li>Informations libres sur vos besoins</li>
            </ul>
            <p className="mt-4">
              Ces données sont transmises via notre API et stockées de manière sécurisée.
              Un email de confirmation vous est envoyé via <strong className="text-white">Resend</strong> (plateforme d'envoi d'emails).
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>3. Finalité du traitement</h2>
            <p>Vos données sont collectées dans les buts suivants :</p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>Vous recontacter pour vous donner accès à Madger</li>
              <li>Comprendre vos besoins afin d'adapter le produit</li>
              <li>Vous envoyer des informations sur le lancement et les mises à jour</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>4. Base légale</h2>
            <p>
              Le traitement de vos données est basé sur votre consentement explicite, exprimé lors de la soumission
              du formulaire d'accès anticipé. Vous pouvez retirer ce consentement à tout moment en nous contactant.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>5. Partage des données</h2>
            <p>
              Vos données ne sont jamais vendues ni partagées à des fins publicitaires.
              Elles peuvent être transmises uniquement aux prestataires techniques nécessaires à notre fonctionnement :
            </p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li><strong className="text-white">Resend</strong> — envoi des emails de confirmation</li>
              <li><strong className="text-white">Vercel</strong> — hébergement et infrastructure</li>
              <li><strong className="text-white">Stripe</strong> — traitement sécurisé des paiements (lors du lancement)</li>
            </ul>
            <p className="mt-4">
              Ces prestataires sont soumis à des obligations strictes de confidentialité et ne peuvent
              utiliser vos données qu'aux fins pour lesquelles ils ont été mandatés.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>6. Durée de conservation</h2>
            <p>
              Vos données sont conservées pendant la durée nécessaire à la gestion de votre accès anticipé,
              et au maximum 3 ans à compter de votre inscription. Passé ce délai, elles sont supprimées ou anonymisées.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>7. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
              vos données contre tout accès non autorisé, perte ou destruction. Les communications entre
              votre navigateur et nos serveurs sont chiffrées via HTTPS/TLS.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>8. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul className="mt-3 flex flex-col gap-2" style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li><strong className="text-white">Accès</strong> — obtenir une copie de vos données</li>
              <li><strong className="text-white">Rectification</strong> — corriger des données inexactes</li>
              <li><strong className="text-white">Suppression</strong> — demander l'effacement de vos données</li>
              <li><strong className="text-white">Opposition</strong> — vous opposer au traitement</li>
              <li><strong className="text-white">Portabilité</strong> — recevoir vos données dans un format structuré</li>
              <li><strong className="text-white">Limitation</strong> — demander la limitation du traitement</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
              Nous répondrons dans un délai de 30 jours.
            </p>
            <p className="mt-3">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
              auprès de la <strong className="text-white">CNIL</strong> :{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>www.cnil.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>9. Cookies</h2>
            <p>
              Madger n'utilise pas de cookies de traçage publicitaire ou d'analyse tierce.
              Le site peut utiliser des cookies techniques strictement nécessaires au bon fonctionnement
              (session, préférences). Ces cookies ne nécessitent pas de consentement préalable.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>10. Modifications</h2>
            <p>
              Nous nous réservons le droit de mettre à jour cette politique à tout moment.
              La date de dernière mise à jour est indiquée ci-dessous.
              En cas de modification substantielle, nous vous informerons par email.
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
