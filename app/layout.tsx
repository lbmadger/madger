import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import GrainOverlay from "@/components/ui/GrainOverlay";
import CustomCursor from "@/components/ui/CustomCursor";
import "./globals.css";

// Inter est auto-hébergée par next/font au build : aucune requête vers
// Google Fonts au runtime (conforme RGPD), pas de @import bloquant.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://madger.app"),
  title: "Madger · De la demande client à la facture encaissée",
  description: "Réservations, paiements et facturation automatique en un seul lien. Pensé pour les coachs indépendants en France. Rejoignez l'early access.",
  keywords: ["coach", "application coach", "réservation séances", "facturation coach", "Stripe coach", "gestion clients coach", "early access"],
  openGraph: {
    title: "Madger - De la demande client à la facture encaissée",
    description: "Un seul lien. Vos clients réservent, paient et reçoivent leur facture. Pensé pour les coachs en France.",
    url: "https://madger.app",
    siteName: "Madger",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Madger - De la demande client à la facture encaissée",
    description: "Un seul lien. Vos clients réservent, paient et reçoivent leur facture. Pensé pour les coachs en France.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Madger",
  url: "https://madger.app",
  logo: "https://madger.app/logo.png",
  description:
    "Réservations, paiements et facturation automatique en un seul lien, pour les coachs indépendants en France.",
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
      <body className={`${inter.variable} antialiased`}>
        {children}
        <GrainOverlay />
        <CustomCursor />
        <Analytics />
      </body>
    </html>
  );
}
