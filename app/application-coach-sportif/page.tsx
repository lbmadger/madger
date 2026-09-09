import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/ui/SectionLabel";
import { FEE_RATE_BPS } from "@/lib/subscription/plan";
import { currentMonthlyCents } from "@/lib/subscription/offer";

export const metadata: Metadata = {
  title: "Madger, l'application des coachs sportifs : réservation, paiement, facture",
  description:
    "Madger est l'application des coachs sportifs pour vendre leurs séances : lien de réservation, paiement en ligne à la réservation, facture automatique. Plus de no-show, zéro relance.",
  alternates: { canonical: "/application-coach-sportif" },
  openGraph: {
    title: "Madger, l'application des coachs sportifs : réservation, paiement, facture",
    description:
      "Lien de réservation, paiement en ligne à la réservation, facture automatique. Plus de no-show, zéro relance.",
    url: "https://madger.app/application-coach-sportif",
    siteName: "Madger",
    locale: "fr_FR",
    type: "website",
  },
};

// Page de référencement sur la requête « application coach sportif » : elle
// explique ce qu'une application pour coach sportif doit faire, comment Madger
// supprime le no-show (séance payée à la réservation) et ce que ça coûte. Tout
// ce qui est décrit ici existe dans le produit aujourd'hui.

const ESSENTIAL_PCT = FEE_RATE_BPS.essential / 100;
const PRO_PCT = FEE_RATE_BPS.pro / 100;

const MUST_HAVE: { title: string; desc: string }[] = [
  { title: "Un lien de réservation à ton nom", desc: "madger.app/toi : tes prestations, tes créneaux, ton lieu ou ta visio. À mettre en bio Instagram, en signature d'email, dans tes conversations WhatsApp." },
  { title: "Le paiement au moment de la réservation", desc: "Carte, Apple Pay ou Google Pay via Stripe. La séance est payée avant d'être donnée : c'est ce qui fait disparaître le no-show." },
  { title: "Une politique d'annulation appliquée toute seule", desc: "Tu choisis ton délai (12, 24 ou 48 h) et ce qui est remboursé avant et après. Le client la voit avant de payer, l'application l'applique sans que tu aies à négocier." },
  { title: "La facture envoyée sans rien faire", desc: "Numérotée, avec tes mentions légales, envoyée au client à chaque séance encaissée. Export comptable en un clic." },
  { title: "Packs, abonnements et cours collectifs", desc: "Pack de 5, 10 ou 20 séances, abonnement mensuel, cours collectif avec places limitées. Le client pose ses séances lui-même depuis son espace." },
  { title: "Des rappels automatiques", desc: "La veille et une heure avant, avec l'adresse ou le lien visio. L'oubli, deuxième cause de no-show, disparaît aussi." },
  { title: "Un espace client", desc: "Ses séances, ses factures, ses crédits restants, l'annulation en un clic et la messagerie avec toi. Tu ne réponds plus aux mêmes questions." },
  { title: "Un tableau de bord qui compte pour toi", desc: "Séances du jour, encaissements du mois, clients actifs, avis reçus. Ce que tu gagnes, en un coup d'œil." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Quelle application choisir quand on est coach sportif indépendant ?",
    a: "Celle qui règle ton vrai problème : être payé pour chaque séance sans courir après tes clients. Une application pour coach sportif doit au minimum proposer un lien de réservation, le paiement en ligne au moment de la réservation, une politique d'annulation appliquée automatiquement et la facture envoyée sans intervention. Madger fait exactement ça, en un seul lien, sans site à construire.",
  },
  {
    q: "Comment une application peut-elle supprimer les no-shows ?",
    a: "En faisant payer la séance à la réservation. Un client qui a déjà payé vient, ou annule dans les délais que tu as fixés. S'il annule trop tard, ta politique d'annulation s'applique toute seule : la séance reste due, en partie ou en totalité, selon tes règles. Ajoute les rappels automatiques la veille et une heure avant, et il ne reste plus de place pour l'oubli.",
  },
  {
    q: "Combien coûte Madger pour un coach sportif ?",
    a: `Le plan Essentiel est à 0 € par mois, avec ${ESSENTIAL_PCT} % de frais de transaction sur chaque séance encaissée, tout compris. Tu ne vends pas ? Tu ne paies pas. Le plan Pro, à ${currentMonthlyCents() / 100} € par mois et ${PRO_PCT} %, ajoute l'annulation automatique selon tes règles, les relances de renouvellement, l'écran encaissements, l'alerte clients qui décrochent et les statistiques avancées. Il s'essaie 7 jours sans débit.`,
  },
  {
    q: "Mes clients doivent-ils installer une application ?",
    a: "Non. Ils ouvrent ton lien dans leur navigateur, choisissent un créneau, paient, et reçoivent la confirmation et la facture par email. Leur espace client est accessible depuis le même lien, sans rien télécharger.",
  },
];

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ApplicationCoachSportifPage() {
  const launched = process.env.SITE_LAUNCHED === "1";
  const ctaHref = launched ? "/signup" : "/#early-access";
  const ctaLabel = launched ? "Créer mon lien en 5 minutes" : "Rejoindre l'accès anticipé";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main id="main" className="bg-bg relative min-h-screen" style={{ zIndex: 1 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Navbar launched={launched} />

      {/* En-tête */}
      <section className="relative overflow-hidden pt-36 pb-12 sm:pt-44 sm:pb-16">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(203,255,3,0.10), transparent 68%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center flex flex-col items-center">
          <SectionLabel>Application coach sportif</SectionLabel>
          <h1
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(32px, 5.6vw, 66px)", letterSpacing: "-0.04em", lineHeight: 1.02 }}
          >
            L&apos;application des coachs sportifs
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              qui fait payer chaque séance à la réservation.
            </span>
          </h1>
          <p className="text-text-muted max-w-2xl" style={{ fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6 }}>
            Un lien de réservation, le paiement en ligne au moment de réserver, la facture envoyée toute seule.
            Plus de no-show, zéro relance. Madger est fait pour les coachs sportifs indépendants, en salle, en extérieur ou en visio.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href={ctaHref}
              className="cta-shine inline-block font-semibold text-sm px-8 py-4 rounded-full text-center"
              style={{ background: "#CBFF03", color: "#000" }}
            >
              {ctaLabel}
            </Link>
            <Link
              href="/fonctionnalites"
              className="inline-block text-white font-semibold text-sm px-8 py-4 rounded-full text-center"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Voir toutes les fonctionnalités
            </Link>
          </div>
        </div>
      </section>

      {/* Le no-show */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "#CBFF03" }}>
            Le no-show
          </p>
          <h2 className="font-extrabold text-white mb-5" style={{ fontSize: "clamp(24px, 3.2vw, 38px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Une séance réservée sans paiement, c&apos;est une séance que tu peux perdre.
          </h2>
          <div className="space-y-4 text-text-muted" style={{ fontSize: 16, lineHeight: 1.7 }}>
            <p>
              Le client qui réserve par message et qui ne vient pas, celui qui annule une heure avant, celui qui
              « paiera la prochaine fois » : chaque coach sportif connaît ces situations. Le créneau est bloqué,
              la séance est préparée, et rien n&apos;est encaissé.
            </p>
            <p>
              Avec Madger, ton client paie au moment où il réserve. La séance est payée avant d&apos;être donnée.
              S&apos;il annule dans les délais que tu as fixés, il est remboursé selon tes règles. S&apos;il annule trop
              tard ou ne vient pas, ta politique d&apos;annulation s&apos;applique automatiquement, sans discussion.
              Et les rappels automatiques la veille et une heure avant suppriment l&apos;oubli.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { k: "Payée d'avance", v: "Le client règle en réservant, par carte, Apple Pay ou Google Pay." },
              { k: "Annulation encadrée", v: "12, 24 ou 48 h, remboursement avant et après : tu décides, l'app applique." },
              { k: "Rappels automatiques", v: "La veille et une heure avant, avec le lieu ou le lien visio." },
            ].map((b) => (
              <li key={b.k} className="rounded-2xl p-5" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-white font-semibold text-sm sm:text-[15px]">{b.k}</p>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed" style={{ color: "#8C8C8C" }}>{b.v}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Ce qu'une application coach sportif doit faire */}
      <section className="py-12 sm:py-16" style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012), transparent)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="mb-7 sm:mb-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "#CBFF03" }}>
              La checklist
            </p>
            <h2 className="font-extrabold text-white" style={{ fontSize: "clamp(24px, 3.2vw, 38px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              Ce qu&apos;une application pour coach sportif doit faire.
            </h2>
            <p className="mt-3 text-text-muted max-w-2xl" style={{ fontSize: 16, lineHeight: 1.6 }}>
              Huit points à vérifier avant de choisir. Madger coche les huit, dès le plan Essentiel.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {MUST_HAVE.map((f) => (
              <li key={f.title} className="rounded-2xl p-5" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0"><Check /></span>
                  <div>
                    <p className="text-white font-semibold text-sm sm:text-[15px]">{f.title}</p>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed" style={{ color: "#8C8C8C" }}>{f.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "#CBFF03" }}>
            Tarifs
          </p>
          <h2 className="font-extrabold text-white mb-5" style={{ fontSize: "clamp(24px, 3.2vw, 38px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Tu ne vends pas ? Tu ne paies pas.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl p-6" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A" }}>Essentiel</p>
              <p className="mt-2 text-white font-extrabold text-3xl" style={{ letterSpacing: "-0.03em" }}>0 €<span className="text-base font-semibold text-text-muted"> / mois</span></p>
              <p className="mt-1 text-sm text-text-muted">{ESSENTIAL_PCT} % par séance encaissée, tout compris.</p>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "#8C8C8C" }}>Lien, paiement, factures, packs, cours collectifs, rappels, espace client.</p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.25)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#CBFF03" }}>Madger Pro</p>
              <p className="mt-2 text-white font-extrabold text-3xl" style={{ letterSpacing: "-0.03em" }}>{currentMonthlyCents() / 100} €<span className="text-base font-semibold text-text-muted"> / mois</span></p>
              <p className="mt-1 text-sm text-text-muted">{PRO_PCT} % par séance encaissée, tout compris.</p>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "#8C8C8C" }}>Annulation automatique selon tes règles, relances de renouvellement, écran encaissements, alerte clients qui décrochent, statistiques avancées. Essai 7 jours sans débit.</p>
            </div>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--text-dim)" }}>
            Le détail complet est sur la <Link href="/#tarifs" className="underline hover:text-white">section Tarifs</Link> et le <Link href="/fonctionnalites#comparatif" className="underline hover:text-white">comparatif Essentiel / Pro</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16" style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012), transparent)" }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "#CBFF03" }}>
            Questions fréquentes
          </p>
          <h2 className="font-extrabold text-white mb-6" style={{ fontSize: "clamp(24px, 3.2vw, 38px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Application coach sportif : ce qu&apos;on nous demande.
          </h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl p-5" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}>
                <summary className="cursor-pointer list-none text-white font-semibold text-sm sm:text-[15px] flex items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <span aria-hidden className="text-accent transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center flex flex-col items-center">
          <h2 className="font-extrabold text-white mb-4" style={{ fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
            Ta prochaine séance réservée sera déjà payée.
          </h2>
          <p className="text-text-muted mb-8 max-w-xl" style={{ fontSize: 16, lineHeight: 1.6 }}>
            Crée ton lien, ajoute une prestation et tes disponibilités, partage-le. Cinq minutes, montre en main.
          </p>
          <Link
            href={ctaHref}
            className="cta-shine inline-block font-semibold text-sm px-8 py-4 rounded-full"
            style={{ background: "#CBFF03", color: "#000" }}
          >
            {ctaLabel}
          </Link>
          {launched && (
            <p className="mt-3 text-xs" style={{ color: "var(--text-dim)" }}>Sans carte bancaire. Sans engagement.</p>
          )}
        </div>
      </section>

      <Footer launched={launched} />
    </main>
  );
}
