import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales · Madger",
  description: "Mentions légales de Madger, plateforme de réservation et paiement pour coachs indépendants.",
};

export default function MentionsLegales() {
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
          Mentions légales
        </h1>

        <div className="flex flex-col gap-10" style={{ color: "#9A9A9A", fontSize: 15, lineHeight: 1.8 }}>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Éditeur du site</h2>
            <p>
              Le site <strong className="text-white">madger.app</strong> est édité par :<br />
              <strong className="text-white">Madger</strong><br />
              Forme juridique : en cours de constitution<br />
              Email : <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Hébergement</h2>
            <p>
              Le site est hébergé par :<br />
              <strong className="text-white">Vercel Inc.</strong><br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>vercel.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Traitement des paiements</h2>
            <p>
              Les paiements en ligne sont traités par :<br />
              <strong className="text-white">Stripe, Inc.</strong><br />
              185 Berry Street, Suite 550, San Francisco, CA 94107, États-Unis<br />
              Stripe est certifié PCI-DSS niveau 1, le standard de sécurité le plus élevé pour les paiements en ligne.<br />
              <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#CBFF03" }}>Politique de confidentialité Stripe</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments constituant le site madger.app (textes, graphismes, logiciels, images, sons, etc.)
              est la propriété exclusive de Madger ou de ses partenaires. Toute reproduction, représentation, modification,
              publication ou adaptation, totale ou partielle, est interdite sans autorisation préalable écrite de Madger.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Données personnelles</h2>
            <p>
              Les données personnelles collectées via le formulaire d'accès anticipé (prénom, nom, email, téléphone)
              sont utilisées exclusivement pour vous recontacter dans le cadre de l'accès à Madger.
              Elles ne sont jamais revendues ni transmises à des tiers non autorisés.
            </p>
            <p className="mt-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés,
              vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
              Pour l'exercer, contactez-nous à <a href="mailto:contact@madger.app" style={{ color: "#CBFF03" }}>contact@madger.app</a>.
            </p>
            <p className="mt-3">
              Pour plus de détails, consultez notre{" "}
              <Link href="/politique-de-confidentialite" style={{ color: "#CBFF03" }}>politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Cookies</h2>
            <p>
              Ce site n'utilise pas de cookies de traçage publicitaire ou d'analyse tierce.
              Aucune donnée de navigation n'est partagée avec des tiers à des fins publicitaires.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Responsabilité</h2>
            <p>
              Madger s'efforce de maintenir les informations du site à jour et exactes. Cependant,
              Madger ne saurait être tenu responsable des erreurs ou omissions, ni des dommages directs
              ou indirects résultant de l'utilisation du site.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 17 }}>Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français.
              En cas de litige, les tribunaux français seront compétents.
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
