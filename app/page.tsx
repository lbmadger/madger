import dynamic from "next/dynamic";
import MotionSettings from "@/components/ui/MotionSettings";
import Navbar from "@/components/Navbar";
import HeroScrollExperience from "@/components/HeroScrollExperience";
import TrustBar from "@/components/TrustBar";
import ScrollBackground from "@/components/ScrollBackground";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { faqs } from "@/components/faq-data";

// Sections sous la ligne de flottaison : chargées dans des chunks séparés
// pour alléger le JS initial (le hero GSAP est déjà lourd). Le SSR reste
// actif, le contenu est donc toujours présent dans le HTML pour le SEO.
const Problem = dynamic(() => import("@/components/Problem"));
const Athletes = dynamic(() => import("@/components/Athletes"));
const CoachDashboard = dynamic(() => import("@/components/CoachDashboard"));
const Comparison = dynamic(() => import("@/components/Comparison"));
const Compliance2026 = dynamic(() => import("@/components/Compliance2026"));
const Testimonials = dynamic(() => import("@/components/Testimonials"));
const Pricing = dynamic(() => import("@/components/Pricing"));
const FAQ = dynamic(() => import("@/components/FAQ"));
const EarlyAccessForm = dynamic(() => import("@/components/EarlyAccessForm"));
const Footer = dynamic(() => import("@/components/Footer"));

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MotionSettings>
        <ScrollBackground />
        <StickyMobileCTA />
        <main id="main" tabIndex={-1} className="bg-bg relative" style={{ zIndex: 1 }}>
          <Navbar />
          <HeroScrollExperience />
          <div id="after-hero" />
          <TrustBar />
          <Problem />
          <Athletes />
          <CoachDashboard />
          <Comparison />
          <Compliance2026 />
          <Testimonials />
          <Pricing />
          <FAQ />
          <EarlyAccessForm />
          <Footer />
        </main>
      </MotionSettings>
    </>
  );
}
