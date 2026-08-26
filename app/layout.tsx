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
  description: "Ton lien de réservation, tes paiements sécurisés, tes factures automatiques. Tes clients réservent seuls, ton planning se remplit. Fait pour les coachs sportifs indépendants.",
  keywords: ["réservation coach sportif", "coach sportif", "logiciel réservation sport", "prise de rendez-vous coach", "application coach sportif", "paiement en ligne coach", "facturation coach"],
  openGraph: {
    title: "Madger · L'app préférée des coachs sportifs",
    description: "Ton lien de réservation, tes paiements sécurisés, tes factures automatiques. Tes clients réservent seuls, ton planning se remplit.",
    url: "https://madger.app",
    siteName: "Madger",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Madger · L'app préférée des coachs sportifs",
    description: "Ton lien de réservation, tes paiements sécurisés, tes factures automatiques. Tes clients réservent seuls, ton planning se remplit.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Madger",
  url: "https://madger.app",
  logo: "https://madger.app/logo.png",
  description:
    "Réservations, paiements et facturation automatique en un seul lien, pour les coachs sportifs en France.",
  email: "contact@madger.app",
  founder: { "@type": "Person", name: "Léonard Bondeau" },
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
