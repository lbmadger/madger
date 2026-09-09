import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import GrainOverlay from "@/components/ui/GrainOverlay";
import RouteProgress from "@/components/ui/RouteProgress";
import "./globals.css";

// Inter est auto-hébergée par next/font au build : aucune requête vers
// Google Fonts au runtime (conforme RGPD), pas de @import bloquant.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Signature typographique : Space Grotesk porte les titres et les gros
// chiffres (géométrique, caractère sportif qui répond au vert fluo), Inter
// reste le corps de texte. Auto-hébergée comme Inter.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Un débordement horizontal accidentel ne doit plus jamais permettre de
// dézoomer l'app entière sur mobile : échelle verrouillée à 1 et le corps
// coupe tout dépassement (les zones qui défilent gardent leur propre scroll).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://madger.app"),
  alternates: { canonical: "/" },
  // iOS transforme adresses/téléphones en liens soulignés pointillés (très
  // visible sur la facture) : détection coupée, nos liens restent explicites.
  formatDetection: { telephone: false, address: false, email: false },
  title: "Madger · L'app préférée des coachs sportifs",
  description: "L'outil de paiement des coachs sportifs. Ton client réserve et paie en ligne, chaque séance est payée d'avance : plus de no-show, facture envoyée automatiquement.",
  // PWA iOS : ajoutée à l'écran d'accueil, l'app s'ouvre en plein écran
  // sans le chrome Safari (la barre du bas ne bouge plus jamais).
  appleWebApp: {
    capable: true,
    title: "Madger",
    statusBarStyle: "black",
  },
  keywords: ["application coach sportif", "application pour coach sportif", "logiciel coach sportif", "réservation coach sportif", "paiement en ligne coach sportif", "no-show coach sportif", "facturation coach sportif", "prise de rendez-vous coach"],
  openGraph: {
    title: "Madger · L'app préférée des coachs sportifs",
    description: "L'outil de paiement des coachs sportifs. Ton client réserve et paie en ligne, chaque séance est payée d'avance : plus de no-show, facture envoyée automatiquement.",
    url: "https://madger.app",
    siteName: "Madger",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Madger · L'app préférée des coachs sportifs",
    description: "L'outil de paiement des coachs sportifs. Ton client réserve et paie en ligne, chaque séance est payée d'avance : plus de no-show, facture envoyée automatiquement.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Madger",
  url: "https://madger.app",
  logo: "https://madger.app/logo.png",
  description:
    "L'outil de paiement des coachs sportifs : réservation, paiement à la réservation et facture automatique en un seul lien.",
  email: "contact@madger.app",
  founder: { "@type": "Person", name: "Léonard Bondeau" },
};

// Fiche « application » pour Google : catégorie, plateforme web, plan de
// départ sans abonnement. Aucune note ni nombre d'avis inventé.
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Madger",
  url: "https://madger.app",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "fr",
  description:
    "Application pour coach sportif : lien de réservation, paiement en ligne à la réservation, facture automatique. Plus de no-show, zéro relance.",
  audience: { "@type": "Audience", audienceType: "Coachs sportifs indépendants" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Plan Essentiel sans abonnement, frais de transaction sur chaque séance encaissée.",
  },
  featureList: [
    "Lien de réservation à ton nom",
    "Paiement en ligne au moment de la réservation",
    "Politique d'annulation appliquée automatiquement",
    "Facture envoyée automatiquement",
    "Packs, abonnements et cours collectifs",
    "Rappels automatiques par email",
    "Espace client",
  ],
  publisher: { "@type": "Organization", name: "Madger", url: "https://madger.app" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `history.scrollRestoration = 'manual'; window.scrollTo(0, 0);` }} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} overflow-x-hidden antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Aller au contenu
        </a>
        {/* Retour visuel pendant les changements de page : barre de
            progression, puis voile animé si l'attente se prolonge. */}
        <RouteProgress />
        {children}
        <GrainOverlay />
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
