"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const steps = [
  {
    num: "01",
    title: "Facture générée automatiquement",
    desc: "Dès qu'un client paie sa séance, Madger génère une facture conforme au format légal exigé : numérotée, datée, avec toutes les mentions obligatoires.",
  },
  {
    num: "02",
    title: "Format Factur-X certifié",
    desc: "Nos factures sont émises au format Factur-X (PDF/A-3 + données XML embarquées), le standard européen reconnu par l'administration fiscale française.",
  },
  {
    num: "03",
    title: "Archivage 10 ans inclus",
    desc: "Toutes vos factures sont archivées automatiquement pendant 10 ans conformément à l'obligation légale. Téléchargeables à tout moment depuis votre dashboard.",
  },
  {
    num: "04",
    title: "Prêt pour la réforme 2026",
    desc: "La facturation électronique obligatoire entre en vigueur progressivement jusqu'en 2027. Madger est déjà conforme, vous n'avez rien à faire.",
  },
];

export default function EFacture() {
  return (
    <section id="conformite" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(74,222,128,0.04), transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left - text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <SectionLabel>Conformité légale</SectionLabel>
            <h2
              className="font-extrabold text-white mt-4 mb-5"
              style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
            >
              Prêt pour la réforme<br />
              <span style={{
                background: "linear-gradient(90deg, #4ADE80, #22c55e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>e-facture obligatoire.</span>
            </h2>
            <p className="text-text-muted mb-8" style={{ fontSize: 16, lineHeight: 1.7 }}>
              La France rend la <strong className="text-white">facturation électronique obligatoire</strong> pour toutes les entreprises d'ici 2027 (ordonnance du 15 septembre 2021). Concrètement : chaque vente devra générer une facture dans un format numérique certifié, transmise via une plateforme agréée.
            </p>

            {/* Alert box */}
            <div
              className="flex gap-3 p-4 rounded-2xl mb-8"
              style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)" }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="rgba(74,222,128,0.15)" stroke="#4ADE80" strokeWidth="2"/>
                  <path d="M9 12l2 2 4-4" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: "#4ADE80" }}>Madger est déjà conforme</div>
                <p className="text-sm" style={{ color: "#8A8A8A", lineHeight: 1.6 }}>
                  Vos factures sont générées au format <strong className="text-white">Factur-X</strong> (standard européen PDF/A-3 + XML), archivées 10 ans, et prêtes pour la transmission via plateforme certifiée. Vous ne changez rien à votre façon de travailler.
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              {[
                { val: "2027", label: "Entrée en vigueur\npour les TPE/PME" },
                { val: "10 ans", label: "Archivage légal\ngaranti inclus" },
                { val: "100 %", label: "Automatique,\nzéro action requise" },
              ].map(({ val, label }) => (
                <div key={val}>
                  <div className="font-extrabold" style={{ fontSize: 24, color: "#4ADE80", letterSpacing: "-0.03em", lineHeight: 1 }}>{val}</div>
                  <div className="text-xs mt-1 whitespace-pre-line" style={{ color: "#5A5A5A", lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - steps */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Number + line */}
                <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                  <div
                    className="flex items-center justify-center font-bold text-xs"
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.25)",
                      color: "#4ADE80",
                    }}
                  >
                    {step.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ width: 1, flex: 1, marginTop: 6, background: "rgba(255,255,255,0.06)" }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ paddingTop: 4 }}>
                  <div className="font-bold text-white mb-1.5" style={{ fontSize: 14, letterSpacing: "-0.01em" }}>{step.title}</div>
                  <p style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}

            {/* Bottom badge */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#4ADE80" strokeWidth="1.8"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#4ADE80" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#4ADE80" }}>Format Factur-X · PDF/A-3 + XML</div>
                <div className="text-xs mt-0.5" style={{ color: "#5A5A5A" }}>Standard reconnu par la DGFiP · Compatible Chorus Pro et plateformes PDP agréées</div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
