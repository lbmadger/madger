"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const steps = [
  {
    num: "01",
    title: "Vous créez vos offres",
    desc: "Définissez vos séances, vos durées, vos prix et vos disponibilités en quelques minutes.",
  },
  {
    num: "02",
    title: "Vous partagez votre lien",
    desc: "Un seul lien Madger à mettre dans votre bio Instagram, vos messages, vos signatures.",
  },
  {
    num: "03",
    title: "Le client réserve et paie",
    desc: "Réservation et paiement en moins d'une minute. Confirmation et facture envoyées automatiquement.",
  },
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

export default function Solution() {
  return (
    <section
      id="fonctionnement"
      className="py-28 relative"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(203,255,3,0.02), transparent)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <SectionLabel>La solution</SectionLabel>
          <h2
            className="font-extrabold text-white mb-5"
            style={{
              fontSize: "clamp(32px, 4.5vw, 58px)",
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
            }}
          >
            Un lien. Une séance.{" "}
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>C'est tout.</span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed max-w-xl mb-16" style={{ lineHeight: 1.6 }}>
            Madger regroupe l'essentiel dans un seul lien : vos offres, vos
            créneaux, vos paiements et vos factures.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="spotlight-card card-hover-glow p-9 rounded-3xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
              onMouseMove={handleSpotlight}
            >
              <div className="relative" style={{ zIndex: 2 }}>
                <div
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm mb-6"
                  style={{
                    background: "rgba(203,255,3,0.1)",
                    border: "1px solid rgba(203,255,3,0.22)",
                    color: "#CBFF03",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  className="font-bold text-white mb-2.5"
                  style={{ fontSize: 22, letterSpacing: "-0.02em" }}
                >
                  {step.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed" style={{ lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
