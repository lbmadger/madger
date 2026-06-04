import Navbar from "@/components/Navbar";
import HeroScrollExperience from "@/components/HeroScrollExperience";
import TrustBar from "@/components/TrustBar";
import Problem from "@/components/Problem";
import Athletes from "@/components/Athletes";
import CoachDashboard from "@/components/CoachDashboard";
import Comparison from "@/components/Comparison";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import EarlyAccessForm from "@/components/EarlyAccessForm";
import Footer from "@/components/Footer";
import ScrollBackground from "@/components/ScrollBackground";
import StickyMobileCTA from "@/components/StickyMobileCTA";

export default function Home() {
  return (
    <>
      <ScrollBackground />
      <StickyMobileCTA />
      <main className="bg-bg relative" style={{ zIndex: 1 }}>
        <Navbar />
        <HeroScrollExperience />
        <div id="after-hero" />
        <TrustBar />
        <Problem />
        <Athletes />
        <CoachDashboard />
        <Comparison />
        <Testimonials />
        <Pricing />
        <FAQ />
        <EarlyAccessForm />
        <Footer />
      </main>
    </>
  );
}
