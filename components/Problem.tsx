"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const PAINS = [
  { text: "Je passe plus de temps sur WhatsApp à caler des créneaux qu'à coacher" },
  { text: "Relancer un client pour un paiement, c'est gênant - alors j'attends" },
  { text: "En fin de mois, je rouvre Excel pour refaire les mêmes factures" },
  { text: "Notion, Google Agenda, Stripe, Excel - tout dans des onglets séparés" },
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

export default function Problem() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, 5, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <section className="py-20 sm:py-28 relative">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">

        {/* Stat centrale */}
        <motion.div
          className="text-center mb-14 sm:mb-18"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <SectionLabel>Le problème</SectionLabel>

          {/* Nombre choc */}
          <motion.div
            ref={ref}
            className="text-shimmer font-extrabold leading-none mb-4"
            style={{ fontSize: "clamp(96px, 18vw, 200px)", letterSpacing: "-0.05em" }}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            +{count}h
          </motion.div>

          <div
            className="font-bold text-white mb-4"
            style={{ fontSize: "clamp(18px, 2.5vw, 28px)", letterSpacing: "-0.02em" }}
          >
            perdues en tâches administratives, en moyenne chaque semaine
          </div>
          <p className="text-text-muted max-w-xl mx-auto" style={{ fontSize: 16, lineHeight: 1.65 }}>
            C'est ce que nous disent les coachs qu'on a rencontrés.
            Vous êtes coach, pas secrétaire.
          </p>
        </motion.div>

        {/* Pain points - compact, scannable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {PAINS.map((p, i) => (
            <motion.div
              key={i}
              className="spotlight-card flex items-start gap-3 px-5 py-4 rounded-2xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              onMouseMove={handleSpotlight}
            >
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.15)", fontFamily: "Georgia, serif", lineHeight: 1, marginTop: 2, flexShrink: 0 }}>"</span>
              <span className="relative text-text-muted text-sm leading-relaxed italic" style={{ zIndex: 2 }}>
                {p.text}
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
