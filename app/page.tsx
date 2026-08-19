import dynamic from "next/dynamic";
import MotionSettings from "@/components/ui/MotionSettings";
import Navbar from "@/components/Navbar";
import HeroScrollExperience from "@/components/HeroScrollExperience";
import TrustBar from "@/components/TrustBar";
import ScrollBackground from "@/components/ScrollBackground";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { getFaqs } from "@/components/faq-data";

// Sections sous la ligne de flottaison : chargées dans des chunks séparés
// pour alléger le JS initial (le hero GSAP est déjà lourd). Le SSR reste
// actif, le contenu est donc toujours présent dans le HTML pour le SEO.
const Problem = dynamic(() => import("@/components/Problem"));
const Athletes = dynamic(() => import("@/components/Athletes"));
const CoachDashboard = dynamic(() => import("@/components/CoachDashboard"));
const CoachPagePreview = dynamic(() => import("@/components/CoachPagePreview"));
const Comparison = dynamic(() => import("@/components/Comparison"));
const Compliance2026 = dynamic(() => import("@/components/Compliance2026"));
const Testimonials = dynamic(() => import("@/components/Testimonials"));
const Pricing = dynamic(() => import("@/components/Pricing"));
const FAQ = dynamic(() => import("@/components/FAQ"));
const EarlyAccessForm = dynamic(() => import("@/components/EarlyAccessForm"));
const LaunchCTA = dynamic(() => import("@/components/LaunchCTA"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  // Interrupteur de lancement (le même que le middleware) : une fois
  // SITE_LAUNCHED=1 posé dans Vercel, toute la landing bascule en mode
  // "Créer mon compte" (CTA vers /signup, formulaire d'accès anticipé
  // remplacé par un CTA final). Aucun commit nécessaire le jour J.
  const launched = process.env.SITE_LAUNCHED === "1";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getFaqs(launched).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MotionSettings>
        <ScrollBackground />
        <StickyMobileCTA launched={launched} />
        <main id="main" tabIndex={-1} className="bg-bg relative" style={{ zIndex: 1 }}>
          <Navbar launched={launched} />
          <HeroScrollExperience launched={launched} />
          <div id="after-hero" />
          <TrustBar />
          <Problem />
          <Athletes />
          <CoachDashboard />
          <CoachPagePreview />
          <Comparison launched={launched} />
          <Compliance2026 />
          <Testimonials />
          <Pricing launched={launched} />
          <FAQ launched={launched} />
          {launched ? <LaunchCTA /> : <EarlyAccessForm />}
          <Footer launched={launched} />
        </main>
      </MotionSettings>
    </>
  );
}
