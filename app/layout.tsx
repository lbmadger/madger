import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Madger — L'app qui fait gagner du temps aux coachs",
  description: "Réservations, paiements Stripe et facturation automatique en un seul outil. Pensé pour les coachs en France. Rejoignez l'early access gratuitement.",
  keywords: ["coach", "application coach", "réservation séances", "facturation coach", "Stripe coach", "gestion clients coach", "early access"],
  openGraph: {
    title: "Madger — L'app qui fait gagner du temps aux coachs",
    description: "Réservations, paiements et facturation automatique. Pensé pour les coachs en France.",
    url: "https://madger.app",
    siteName: "Madger",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Madger — L'app qui fait gagner du temps aux coachs",
    description: "Réservations, paiements et facturation automatique. Pensé pour les coachs en France.",
  },
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
