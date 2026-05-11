"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import MadgerLogo from "@/components/ui/MadgerLogo";

const freeFeatures = [
  "Lien public personnalisé",
  "Réservations et paiements illimités",
  "Factures automatiques",
  "Synchronisation Google Calendar",
  "Rappels automatiques",
];

const proFeatures = [
  "Tout le plan Free",
  "0 % de commission Madger",
  "Page coach personnalisable",
  "Statistiques avancées",
  "Support prioritaire",
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

function Check() {
  return (
    <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 49;
  const annualTotal = 490;
  const annualMonthly = Math.round(annualTotal / 12); // 40€/mois
  const saving = monthlyPrice * 12 - annualTotal; // 98€ = ~2 mois

  return (
    <section
      id="tarifs"
      className="py-28 relative"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.01), transparent)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 flex flex-col items-center"
        >
          <SectionLabel>Tarifs</SectionLabel>
          <h2
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(32px, 4.5vw, 58px)", letterSpacing: "-0.035em", lineHeight: 1.04 }}
          >
            Démarrez gratuitement.<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Passez Pro quand vous serez prêt.</span>
          </h2>
          <p className="text-text-muted text-lg max-w-lg mx-auto mb-10" style={{ lineHeight: 1.6 }}>
            Aucun engagement. Vous restez libre de choisir le plan qui colle à votre rythme.
          </p>

          {/* ── Toggle mensuel / annuel ── */}
          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setAnnual(false)}
              className="relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300"
              style={{ color: annual ? "#5A5A5A" : "#fff" }}
            >
              {!annual && (
                <motion.div
                  layoutId="billing-bg"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "#2a2a2a" }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">Mensuel</span>
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              style={{ color: annual ? "#000" : "#5A5A5A" }}
            >
              {annual && (
                <motion.div
                  layoutId="billing-bg"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "#CBFF03" }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">Annuel</span>
              <span
                className="relative z-10 px-1.5 py-0.5 rounded-md text-xs font-bold"
                style={{
                  background: annual ? "rgba(0,0,0,0.15)" : "rgba(203,255,3,0.12)",
                  color: annual ? "#000" : "#CBFF03",
                  fontSize: 10,
                }}
              >
                −{Math.round((saving / (monthlyPrice * 12)) * 100)}%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto pt-6" style={{ overflow: "visible" }}>

          {/* ── Free ── */}
          <motion.div
            className="spotlight-card card-hover-glow p-10 rounded-3xl"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            onMouseMove={handleSpotlight}
          >
            <div className="relative" style={{ zIndex: 2 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <MadgerLogo size={28} />
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A", letterSpacing: "0.1em" }}>
                  Free
                </div>
              </div>
              <div style={{ minHeight: 110 }}>
                <div className="font-extrabold text-white mb-1" style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  0 €
                </div>
                <div className="text-text-muted text-sm pt-1">
                  5 % de commission par séance vendue
                </div>
              </div>
              <a
                href="#early-access"
                className="block w-full text-center text-white text-sm font-semibold py-3 rounded-full mb-7 transition-all duration-200"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              >
                Commencer gratuitement
              </a>
              <div className="my-7" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <ul className="flex flex-col gap-3">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-white">
                    <Check />{f}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ── Pro ── wrapper pour badge flottant */}
          <div className="relative mt-8 md:mt-0" style={{ overflow: "visible" }}>

            {/* Badge flottant — positionné par rapport au wrapper, pas la carte */}
            <AnimatePresence>
              {annual ? (
                <motion.div
                  key="badge-annual"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.22 }}
                  className="absolute -top-3 right-0 px-4 py-1.5 rounded-full text-black font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                  style={{ background: "#CBFF03", letterSpacing: "0.07em", zIndex: 20 }}
                >
                  Recommandé ⭐
                </motion.div>
              ) : (
                <motion.div
                  key="badge-monthly"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.22 }}
                  className="absolute -top-3 right-0 px-4 py-1.5 rounded-full text-black font-bold text-xs uppercase tracking-wider whitespace-nowrap"
                  style={{ background: "#CBFF03", letterSpacing: "0.07em", zIndex: 20 }}
                >
                  0 % commission
                </motion.div>
              )}
            </AnimatePresence>

          <motion.div
            className="spotlight-card rounded-3xl relative"
            style={{
              background: "linear-gradient(160deg, rgba(203,255,3,0.07), rgba(203,255,3,0.02) 60%, transparent)",
              border: "1px solid rgba(203,255,3,0.28)",
              boxShadow: "0 0 60px rgba(203,255,3,0.06)",
              transition: "box-shadow 400ms ease",
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onMouseMove={handleSpotlight}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 80px rgba(203,255,3,0.14), 0 0 0 1px rgba(203,255,3,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 60px rgba(203,255,3,0.06)")}
          >

            <div className="p-10 relative" style={{ zIndex: 2 }}>
              {/* Logo + label */}
              <div className="flex items-center gap-2.5 mb-3">
                <MadgerLogo size={28} />
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#CBFF03", letterSpacing: "0.1em" }}>
                  Pro
                </div>
              </div>

              {/* Prix animé */}
              <div style={{ minHeight: 110 }}>
              <AnimatePresence mode="wait">
                {annual ? (
                  <motion.div
                    key="annual"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex items-end gap-2 mb-1">
                      <span className="font-extrabold text-white" style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                        {annualMonthly} €
                      </span>
                      <span className="text-text-muted text-lg mb-1">/ mois</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm"
                        style={{ color: "#5A5A5A", textDecoration: "line-through" }}
                      >
                        588 € / an
                      </span>
                      <span
                        className="text-sm font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(203,255,3,0.12)", color: "#CBFF03" }}
                      >
                        490 € / an
                      </span>
                    </div>
                    <div className="text-text-muted text-sm">
                      Vous économisez {saving} € · 0 % de commission
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="monthly"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1 mb-2">
                      <span className="font-extrabold text-white" style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                        {monthlyPrice} €
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-text-muted text-lg">/ mois</span>
                        <div
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#8A8A8A" }}
                        >
                          ou 490 €/an
                        </div>
                      </div>
                    </div>
                    <div className="text-text-muted text-sm">
                      Aucune commission sur vos ventes
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              <motion.a
                href="#early-access"
                className="block w-full text-center text-black text-sm font-semibold py-3 rounded-full mb-7"
                style={{ background: "#CBFF03" }}
                whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.5), 0 0 60px rgba(203,255,3,0.2)" }}
                transition={{ duration: 0.2 }}
              >
                {annual ? "Passer Pro — Annuel" : "Passer Pro"}
              </motion.a>

              <div className="my-7" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <ul className="flex flex-col gap-3">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-white">
                    <Check />{f}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
