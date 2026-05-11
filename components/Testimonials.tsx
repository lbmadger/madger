"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const testimonials = [
  {
    photo: "photo-1534528741775-53994a69daeb",
    name: "Camille Rousseau",
    role: "Coach fitness · Lyon",
    text: "Je jongle entre WhatsApp, Sumeria et Excel pour gérer mes séances. J'ai rejoint la bêta dès que j'ai vu que Madger centralisait tout : réservation, paiement et facture en une fois.",
    tag: "Testeuse bêta",
  },
  {
    photo: "photo-1507003211169-0a1dd7228f2d",
    name: "Thomas Girard",
    role: "Préparateur physique · Paris",
    text: "Les relances de paiement c'est ce que je déteste le plus dans mon métier. L'idée que le client paie au moment où il réserve, c'est exactement ce qu'il me fallait. J'attends la sortie avec impatience.",
    tag: "Testeur bêta",
  },
  {
    photo: "photo-1438761681033-6461ffad8d80",
    name: "Sarah Moreau",
    role: "Coach bien-être · Bordeaux",
    text: "J'ai un site Wix qui date de 2021, aucun système de réservation en ligne. Avoir un lien pro à mettre dans ma bio Instagram qui permet de réserver et payer directement, c'est ce que j'attendais.",
    tag: "Testeuse bêta",
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
          className="text-center flex flex-col items-center mb-14"
        >
          <SectionLabel>Bêta testeurs</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Des coachs qui testent la bêta<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>pour vous.</span>
          </h2>
          <p className="text-text-muted text-base max-w-md mx-auto" style={{ lineHeight: 1.6 }}>
            Ils nous ont parlé de leurs galères. On construit Madger pour les résoudre.
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

              {/* Beta tag */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-5 self-start"
                style={{ background: "rgba(203,255,3,0.06)", border: "1px solid rgba(203,255,3,0.15)", color: "#CBFF03" }}
              >
                <span className="glow-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#CBFF03", display: "block" }} />
                {t.tag}
              </div>

              <p className="text-sm flex-1" style={{ color: "#A0A0A0", lineHeight: 1.75 }}>
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(203,255,3,0.2)", flexShrink: 0 }}>
                  <img
                    src={`https://images.unsplash.com/${t.photo}?w=100&h=100&fit=crop&auto=format&q=80`}
                    alt={t.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs" style={{ color: "#5A5A5A" }}>{t.role}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(203,255,3,0.06)", border: "1px solid rgba(203,255,3,0.15)", color: "#CBFF03", whiteSpace: "nowrap" }}>
                  Teste la bêta
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
