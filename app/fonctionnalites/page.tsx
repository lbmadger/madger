import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/ui/SectionLabel";
import { FEE_RATE_BPS } from "@/lib/subscription/plan";
import { currentMonthlyCents } from "@/lib/subscription/offer";

export const metadata: Metadata = {
  title: "Madger · Toutes les fonctionnalités",
  description:
    "Tout ce que le lien Madger fait pour un coach sportif : réservation, paiement, factures, packs, cours collectifs, rappels, espace client. Et ce que Madger Pro ajoute.",
  alternates: { canonical: "/fonctionnalites" },
};

// Page « Fonctionnalités » : la liste COMPLÈTE de ce qui existe dans Madger
// aujourd'hui (rien d'annoncé), groupée par usage, puis le comparatif
// Essentiel / Pro avec coches et croix. Les verrous Pro listés ici sont ceux
// réellement posés dans le code (annulation paramétrable, relances, écran
// encaissements, alertes clients qui décrochent, statistiques avancées, export clients).

type Feature = { title: string; desc: string };
type Group = { label: string; title: string; features: Feature[] };

const GROUPS: Group[] = [
  {
    label: "Vendre",
    title: "Ta page, ton lien, tes offres.",
    features: [
      { title: "Page publique à ton nom", desc: "madger.app/toi : bio, sport, ville, salle, visio, photos, avis. Ta vitrine, sans site à construire." },
      { title: "Prestations à ta façon", desc: "Séance à l'unité, pack de 5, 10 ou 20 séances, abonnement mensuel, cours collectif avec places limitées, pack de places collectives." },
      { title: "Lien prêt à partager", desc: "Copie en un clic, WhatsApp, SMS, bio Instagram, feuille de partage native sur mobile. Story Instagram générée pour tes chiffres et tes avis." },
      { title: "Annuaire des coachs", desc: "Ta page apparaît dans la recherche par sport et par ville. Classement par ancienneté et complétude du profil, jamais sponsorisé." },
      { title: "Badges factuels", desc: "Coach vérifié après contrôle de ton diplôme, Super coach gagné par tes avis. Confirmation immédiate ou paiement à l'acceptation affichés sous ton nom." },
    ],
  },
  {
    label: "Réserver",
    title: "Tes clients choisissent, tu n'as rien à caler.",
    features: [
      { title: "Créneaux réels", desc: "Calculés depuis tes disponibilités, moins tes séances, tes cours et les paiements en cours. Délai minimum de réservation réglable." },
      { title: "Instantané ou sur validation", desc: "Tu choisis : le créneau est confirmé au paiement, ou tu acceptes chaque demande et la carte n'est débitée qu'à ce moment-là." },
      { title: "Liste d'attente", desc: "Un créneau pris peut être demandé : si la séance s'annule, le client est prévenu en premier." },
      { title: "Report proposé au client", desc: "Tu proposes un autre créneau, le client confirme ou en choisit un autre. Sans réponse sous 48 h, le report est validé." },
      { title: "Google Calendar et Google Meet", desc: "Tes séances dans ton agenda, et un lien Meet créé automatiquement pour chaque séance en visio." },
      { title: "Rappels automatiques par email", desc: "La veille et une heure avant, avec le lieu ou le lien visio. Le no-show par oubli disparaît." },
    ],
  },
  {
    label: "Encaisser",
    title: "Payé à la réservation, versé après la séance.",
    features: [
      { title: "Paiement à la réservation", desc: "Carte, Apple Pay, Google Pay, Link. Le client paie avant de venir, tu n'as plus de relance à faire." },
      { title: "Paiement sécurisé et versement", desc: "Les fonds sont sécurisés par Stripe, libérés 24 h après la séance, virés chaque semaine sur ton compte." },
      { title: "Paiement en 3 fois", desc: "Klarna ou Alma sur les packs dès 120 €, si tu l'actives. Le client paie en trois fois, tu es versé en une." },
      { title: "Règle d'annulation appliquée seule", desc: "Remboursement calculé automatiquement selon le délai, avoir émis, crédit de pack rendu ou décompté. Le coach qui annule rembourse toujours à 100 %." },
      { title: "Litiges et remboursements compris", desc: "Un client signale un problème, les fonds restent bloqués, Madger tranche. Frais de carte, remboursements et litiges inclus dans le pourcentage." },
      { title: "Geste commercial", desc: "Offre une séance ou rends un crédit depuis la fiche client, en un clic, journalisé." },
    ],
  },
  {
    label: "Facturer",
    title: "Conforme sans y penser.",
    features: [
      { title: "Facture automatique", desc: "Chaque paiement génère une facture numérotée sans trou, à tes mentions légales, envoyée au client en PDF." },
      { title: "Avoir automatique", desc: "Chaque remboursement génère son avoir, numéroté et envoyé de la même façon." },
      { title: "SIRET vérifié, TVA gérée", desc: "Ton SIRET est contrôlé dans l'annuaire officiel. Franchise en base ou taux de TVA, la facture ventile HT, TVA et TTC." },
      { title: "Export comptable", desc: "Toutes tes factures et tes avoirs en CSV pour ton expert-comptable. Madger t'adresse sa propre facture mensuelle pour ses frais." },
    ],
  },
  {
    label: "Fidéliser",
    title: "Tes clients restent, sans que tu coures après.",
    features: [
      { title: "Espace client", desc: "Séances à venir, lien visio, factures, annulation en un clic, réservation sur ses crédits, places en cours collectif." },
      { title: "Packs protégés", desc: "Validité et délai d'annulation propres à chaque pack, séances par semaine limitées si tu veux, prolongation automatique si c'est toi qui bloques." },
      { title: "Messagerie intégrée", desc: "Un fil par client, notifications en temps réel, sans donner ton numéro." },
      { title: "Avis clients", desc: "Un avis par client après la séance, relance unique à J+3, réponse publique du coach, signalement à l'équipe." },
      { title: "Récap du lundi", desc: "Chaque semaine par email : séances, encaissements, nouveaux clients, note moyenne." },
    ],
  },
];

// Comparatif : `essential` et `pro` sont soit un booléen (coche / croix),
// soit un texte quand la différence ne tient pas dans une coche.
type Row = { label: string; essential: boolean | string; pro: boolean | string };

function buildRows(): Row[] {
  const proMonthly = currentMonthlyCents() / 100;
  return [
    { label: "Abonnement", essential: "0 € par mois", pro: `${proMonthly} € par mois` },
    { label: "Frais de transaction, tout compris", essential: `${FEE_RATE_BPS.essential / 100} %`, pro: `${FEE_RATE_BPS.pro / 100} %` },
    { label: "Page publique, lien à partager, annuaire", essential: true, pro: true },
    { label: "Séances, packs, abonnements, cours collectifs", essential: true, pro: true },
    { label: "Créneaux réels, liste d'attente, report", essential: true, pro: true },
    { label: "Paiement à la réservation, versement hebdomadaire", essential: true, pro: true },
    { label: "Paiement en 3 fois sur les packs", essential: true, pro: true },
    { label: "Factures et avoirs automatiques, export comptable", essential: true, pro: true },
    { label: "Google Calendar, Google Meet", essential: true, pro: true },
    { label: "Rappels email la veille et une heure avant", essential: true, pro: true },
    { label: "Espace client, messagerie, avis", essential: true, pro: true },
    { label: "Récap hebdomadaire par email", essential: true, pro: true },
    { label: "Règle d'annulation", essential: "Fixe : remboursé à 100 % à plus de 24 h, rien en deçà", pro: "Tes règles : 12, 24 ou 48 h, pourcentages au choix" },
    { label: "Relances de renouvellement de packs", essential: false, pro: true },
    { label: "Écran encaissements par client, export clients", essential: false, pro: true },
    { label: "Alerte clients qui décrochent, chaque matin", essential: false, pro: true },
    { label: "Statistiques avancées", essential: false, pro: true },
    { label: "Prix de lancement gardé tant que tu restes abonné", essential: false, pro: true },
  ];
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Cell({ value, pro }: { value: boolean | string; pro?: boolean }) {
  if (typeof value === "string") {
    return (
      <span
        className="text-xs sm:text-sm leading-snug"
        style={{ color: pro ? "#fff" : "#C9C9C4", fontWeight: pro ? 600 : 500 }}
      >
        {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center">
      {value ? <Check /> : <Cross />}
      <span className="sr-only">{value ? "Inclus" : "Non inclus"}</span>
    </span>
  );
}

export default function FeaturesPage() {
  const launched = process.env.SITE_LAUNCHED === "1";
  const ctaHref = launched ? "/signup" : "/#early-access";
  const rows = buildRows();

  return (
    <main id="main" className="bg-bg relative min-h-screen" style={{ zIndex: 1 }}>
      <Navbar launched={launched} />

      {/* En-tête */}
      <section className="relative overflow-hidden pt-36 pb-12 sm:pt-44 sm:pb-16">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(203,255,3,0.10), transparent 68%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center flex flex-col items-center">
          <SectionLabel>Fonctionnalités</SectionLabel>
          <h1
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(34px, 6vw, 72px)", letterSpacing: "-0.04em", lineHeight: 1.0 }}
          >
            Tout ce que ton lien
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              fait pour toi.
            </span>
          </h1>
          <p className="text-text-muted max-w-2xl" style={{ fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6 }}>
            Chaque fonctionnalité ci-dessous existe aujourd&apos;hui dans Madger. Rien d&apos;annoncé, rien de « bientôt ».
            Tout est compris dans Essentiel, sauf ce qui est marqué Pro dans le comparatif en bas de page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            {GROUPS.map((g) => (
              <a
                key={g.label}
                href={`#${g.label.toLowerCase()}`}
                className="rounded-full px-3.5 py-1.5 font-semibold transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#C9C9C4" }}
              >
                {g.label}
              </a>
            ))}
            <a
              href="#comparatif"
              className="rounded-full px-3.5 py-1.5 font-semibold"
              style={{ border: "1px solid rgba(203,255,3,0.35)", color: "#CBFF03", background: "rgba(203,255,3,0.06)" }}
            >
              Essentiel ou Pro ?
            </a>
          </div>
        </div>
      </section>

      {/* Groupes de fonctionnalités */}
      {GROUPS.map((g, gi) => (
        <section
          key={g.label}
          id={g.label.toLowerCase()}
          className="scroll-mt-24 py-12 sm:py-16"
          style={gi % 2 === 1 ? { background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012), transparent)" } : undefined}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="mb-7 sm:mb-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "#CBFF03" }}>
                {g.label}
              </p>
              <h2
                className="font-extrabold text-white"
                style={{ fontSize: "clamp(24px, 3.2vw, 38px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
              >
                {g.title}
              </h2>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {g.features.map((f) => (
                <li
                  key={f.title}
                  className="rounded-2xl p-5"
                  style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
                >
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
      ))}

      {/* Comparatif Essentiel / Pro */}
      <section id="comparatif" className="scroll-mt-24 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-10 flex flex-col items-center">
            <SectionLabel>Essentiel ou Pro</SectionLabel>
            <h2
              className="font-extrabold text-white mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.035em", lineHeight: 1.05 }}
            >
              Tout le socle en Essentiel.
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Pro garde tes clients et baisse tes frais.
              </span>
            </h2>
            <p className="text-text-muted max-w-xl" style={{ fontSize: 16, lineHeight: 1.6 }}>
              Essentiel suffit pour vendre, encaisser et facturer. Pro s&apos;adresse au coach qui encaisse régulièrement :
              moins de frais sur chaque séance, et les automatismes qui évitent les no-shows et les clients qui décrochent.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-3xl"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* En-tête du tableau */}
            <div
              className="grid items-end"
              style={{ gridTemplateColumns: "1.6fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="px-4 py-4 sm:px-6" />
              <div className="px-2 py-4 text-center sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A" }}>Essentiel</p>
                <p className="mt-1 text-white font-extrabold text-lg sm:text-2xl" style={{ letterSpacing: "-0.03em" }}>0 €</p>
              </div>
              <div
                className="px-2 py-4 text-center sm:px-4"
                style={{ background: "rgba(203,255,3,0.05)", borderLeft: "1px solid rgba(203,255,3,0.15)" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#CBFF03" }}>Madger Pro</p>
                <p className="mt-1 text-white font-extrabold text-lg sm:text-2xl" style={{ letterSpacing: "-0.03em" }}>
                  {currentMonthlyCents() / 100} €
                </p>
              </div>
            </div>

            {rows.map((r, i) => (
              <div
                key={r.label}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "1.6fr 1fr 1fr",
                  borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <div className="px-4 py-3.5 text-xs sm:px-6 sm:text-sm text-white">{r.label}</div>
                <div className="px-2 py-3.5 text-center sm:px-4">
                  <Cell value={r.essential} />
                </div>
                <div
                  className="px-2 py-3.5 text-center sm:px-4 h-full flex items-center justify-center"
                  style={{ background: "rgba(203,255,3,0.04)", borderLeft: "1px solid rgba(203,255,3,0.12)" }}
                >
                  <Cell value={r.pro} pro />
                </div>
              </div>
            ))}

            {/* Pied : CTA */}
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: "1.6fr 1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="px-4 py-4 text-[11px] sm:px-6 sm:text-xs" style={{ color: "var(--text-dim)" }}>
                Tu ne vends pas ? Tu ne paies pas. Pro s&apos;essaie 7 jours, sans débit.
              </div>
              <div className="px-2 py-4 text-center sm:px-4">
                <Link
                  href={ctaHref}
                  className="inline-block rounded-full px-3 py-2 text-[11px] sm:text-xs font-semibold text-white transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.14)" }}
                >
                  {launched ? "Commencer" : "Rejoindre"}
                </Link>
              </div>
              <div
                className="px-2 py-4 text-center sm:px-4 h-full flex items-center justify-center"
                style={{ background: "rgba(203,255,3,0.05)", borderLeft: "1px solid rgba(203,255,3,0.15)" }}
              >
                <Link
                  href={ctaHref}
                  className="inline-block rounded-full px-3 py-2 text-[11px] sm:text-xs font-bold text-black"
                  style={{ background: "#CBFF03" }}
                >
                  {launched ? "Essayer Pro" : "Rejoindre"}
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: "#8C8C8C" }}>
            Le détail des prix, l&apos;offre de lancement et le calculateur sont sur la{" "}
            <a href="/#tarifs" className="underline" style={{ color: "#CBFF03" }}>page des tarifs</a>.
          </p>
        </div>
      </section>

      <Footer launched={launched} />
    </main>
  );
}
