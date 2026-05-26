"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const testimonials = [
  {
    initial: "C",
    color: "#7C6FCD",
    name: "Camille R.",
    role: "Coach fitness · Lyon",
    text: "Je jongle entre WhatsApp, Sumeria et Excel pour gérer mes séances. J'aimerais avoir un seul endroit où tout est centralisé : réservation, paiement et facture en une fois.",
  },
  {
    initial: "T",
    color: "#4A90D9",
    name: "Thomas G.",
    role: "Préparateur physique · Paris",
    text: "Les relances de paiement, c'est ce que je déteste le plus dans mon métier. L'idée que le client paie au moment où il réserve, ça changerait tout pour moi.",
  },
  {
    initial: "S",
    color: "#E07B4A",
    name: "Sarah M.",
    role: "Coach bien-être · Bordeaux",
    text: "J'ai un site Wix qui date de 2021, aucun système de réservation en ligne. Avoir un lien pro à mettre dans ma bio Instagram pour réserver et payer directement, c'est exactement ce qu'il me faut.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(203,255,3,0.03), transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-4"
        >
          <SectionLabel>Ce qu'on entend</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Des coachs ont inspiré Madger.<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Voici ce qu'ils nous ont dit.</span>
          </h2>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-14" style={{ lineHeight: 1.6 }}>
            Ces retours ont été recueillis lors d'interviews menées pendant la conception du produit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col p-7 rounded-3xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
                position: "relative",
              }}
            >
              {/* Quote mark */}
              <div
                style={{
                  position: "absolute", top: 20, right: 22,
                  fontSize: 64, lineHeight: 1, color: "rgba(203,255,3,0.07)",
                  fontFamily: "Georgia, serif", fontWeight: 900,
                  userSelect: "none", pointerEvents: "none",
                }}
              >
                "
              </div>

              <p className="text-sm flex-1 italic" style={{ color: "#A0A0A0", lineHeight: 1.75 }}>
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: t.color,
                    border: "2px solid rgba(255,255,255,0.08)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {t.initial}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs" style={{ color: "#5A5A5A" }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
