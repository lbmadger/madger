"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const benefits = [
  {
    title: "Plus d'allers-retours",
    desc: "Vos clients réservent eux-mêmes. Vous récupérez vos heures.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M12 8V12L14.5 14.5M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Paiements instantanés",
    desc: "Encaissement au moment de la réservation. Plus de relances.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M2 8.5H22M2 8.5C2 6.84 3.34 5.5 5 5.5H19C20.66 5.5 22 6.84 22 8.5M2 8.5V16.5C2 18.16 3.34 19.5 5 19.5H19C20.66 19.5 22 18.16 22 16.5V8.5M6 14H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Factures automatiques",
    desc: "Une facture conforme générée à chaque paiement, sans intervention.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2ZM14 9V3.5L19.5 9H14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Planning unifié",
    desc: "Synchronisé avec Google Calendar. Votre planning centralisé en un seul endroit.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M19 4H5C3.89 4 3 4.89 3 6V20C3 21.11 3.89 22 5 22H19C20.11 22 21 21.11 21 20V6C21 4.89 20.11 4 19 4ZM3 10H21M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Rappels automatiques",
    desc: "Vos clients reçoivent un rappel 24h et 1h avant chaque séance.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M18 8C18 6.4 17.37 4.87 16.24 3.76C15.12 2.63 13.6 2 12 2C10.4 2 8.88 2.63 7.76 3.76C6.63 4.87 6 6.4 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8ZM13.73 21C13.55 21.3 13.3 21.55 13 21.72C12.71 21.9 12.36 22 12 22C11.64 22 11.29 21.9 11 21.72C10.7 21.55 10.45 21.3 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Image professionnelle",
    desc: "Un lien et une page coach que vous êtes fier d'envoyer à vos clients.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M9 11L12 14L22 4M21 12V19C21 19.53 20.79 20.04 20.41 20.41C20.04 20.79 19.53 21 19 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

export default function Benefits() {
  return (
    <section className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <SectionLabel>Bénéfices concrets</SectionLabel>
          <h2
            className="font-extrabold text-white mb-16"
            style={{
              fontSize: "clamp(32px, 4.5vw, 58px)",
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
            }}
          >
            Moins d'administratif.{" "}
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Plus de coaching.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              className="spotlight-card card-hover-glow p-8 rounded-2xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: "easeOut" }}
              onMouseMove={handleSpotlight}
            >
              <div className="relative" style={{ zIndex: 2 }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 text-accent"
                  style={{
                    background: "rgba(203,255,3,0.08)",
                    border: "1px solid rgba(203,255,3,0.18)",
                  }}
                >
                  {b.icon}
                </div>
                <h3
                  className="font-bold text-white mb-2"
                  style={{ fontSize: 18, letterSpacing: "-0.02em" }}
                >
                  {b.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed" style={{ lineHeight: 1.6 }}>
                  {b.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
