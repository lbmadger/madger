"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import MadgerLogo from "@/components/ui/MadgerLogo";

const SHARE_CHANNELS = [
  { icon: "📸", label: "Bio Instagram",    sub: "@votre_compte → 1 lien = tout" },
  { icon: "✉️", label: "Signature email",  sub: "Chaque email devient une vitrine" },
  { icon: "💬", label: "Message WhatsApp", sub: "Envoyez le lien, c'est réservé" },
  { icon: "🌐", label: "Site / portfolio", sub: "Bouton de réservation instantané" },
];

export default function BookingLink() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(203,255,3,0.05), transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <SectionLabel>Votre page coach</SectionLabel>
            <h2
              className="font-extrabold text-white mt-4 mb-5"
              style={{ fontSize: "clamp(28px, 4vw, 50px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
            >
              Un lien.<br />
              <span style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Tout se réserve et se paye.</span>
            </h2>
            <p className="text-text-muted mb-8" style={{ fontSize: 16, lineHeight: 1.7 }}>
              Madger vous génère une page coach personnalisée à votre image.
              Vos clients la trouvent, choisissent leur séance et paient — sans que vous ayez rien à faire.
              Partagez-la <strong className="text-white">une seule fois</strong>, elle travaille en permanence.
            </p>

            {/* Share channels */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {SHARE_CHANNELS.map(({ icon, label, sub }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5 }}
                  className="flex items-start gap-3 p-3.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#5A5A5A" }}>{sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              {[
                { val: "3 min", label: "Pour configurer\nvotre page" },
                { val: "1 lien", label: "À partager\npartout" },
                { val: "24/7",  label: "Réservations\nmême la nuit" },
              ].map(({ val, label }) => (
                <div key={val}>
                  <div className="font-extrabold" style={{ fontSize: 24, color: "#CBFF03", letterSpacing: "-0.03em", lineHeight: 1 }}>{val}</div>
                  <div className="text-xs mt-1 whitespace-pre-line" style={{ color: "#5A5A5A", lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — page mockup */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col items-center gap-6"
          >
            {/* URL bar — interactive */}
            <motion.div
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(203,255,3,0.25)",
                boxShadow: "0 0 30px rgba(203,255,3,0.08)",
              }}
            >
              {/* Lock icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#4ADE80" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {/* URL text */}
              <span className="flex-1 font-mono text-sm" style={{ color: "#CBFF03" }}>
                madger.app/<span style={{ color: "#fff" }}>votre-nom</span>
              </span>
              {/* Copy button */}
              <motion.button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: copied ? "rgba(74,222,128,0.15)" : "#CBFF03",
                  color: copied ? "#4ADE80" : "#000",
                  border: copied ? "1px solid rgba(74,222,128,0.3)" : "none",
                  minWidth: 80,
                  justifyContent: "center",
                }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5l-7 7-3-3" stroke="#4ADE80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copié !
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="#000" strokeWidth="2.2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#000" strokeWidth="2.2"/>
                      </svg>
                      Copier
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>

            {/* Booking page preview card */}
            <motion.div
              className="w-full rounded-3xl overflow-hidden"
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(203,255,3,0.06)",
              }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {/* Page header */}
              <div
                className="px-6 py-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg, rgba(203,255,3,0.05), transparent)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(203,255,3,0.3)" }}>
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&auto=format&q=80" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Marie Laurent</div>
                    <div className="text-xs" style={{ color: "#5A5A5A" }}>Coach bien-être · Lyon</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80" }} />
                    <span className="text-xs font-medium" style={{ color: "#4ADE80" }}>Disponible</span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#8A8A8A", lineHeight: 1.5 }}>
                  Coach certifiée spécialisée en remise en forme et bien-être. Séances en présentiel (Lyon 6e) ou en visio.
                </p>
              </div>

              {/* Sessions */}
              <div className="px-6 py-4">
                <div className="text-xs font-semibold text-white mb-3">Choisissez votre séance</div>
                <div className="flex flex-col gap-2">
                  {[
                    { name: "Séance découverte", duration: "45 min", price: "Gratuit", tag: "Populaire" },
                    { name: "Coaching individuel", duration: "60 min", price: "50 €", tag: null },
                    { name: "Suivi mensuel (4 séances)", duration: "4 × 60 min", price: "160 €", tag: "Meilleure valeur" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl"
                      style={{
                        background: i === 0 ? "rgba(203,255,3,0.05)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${i === 0 ? "rgba(203,255,3,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-white leading-snug">{s.name}</span>
                          {s.tag && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: i === 0 ? "rgba(203,255,3,0.15)" : "rgba(74,222,128,0.1)", color: i === 0 ? "#CBFF03" : "#4ADE80", border: `1px solid ${i === 0 ? "rgba(203,255,3,0.3)" : "rgba(74,222,128,0.2)"}` }}>
                              {s.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#5A5A5A" }}>{s.duration}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm whitespace-nowrap" style={{ color: i === 0 ? "#4ADE80" : "#fff" }}>{s.price}</span>
                        <div className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap" style={{ background: i === 0 ? "#CBFF03" : "rgba(255,255,255,0.07)", color: i === 0 ? "#000" : "#fff" }}>
                          Réserver
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Powered by Madger */}
                <div className="flex items-center justify-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <MadgerLogo size={14} />
                  <span className="text-xs" style={{ color: "#3A3A3A" }}>Propulsé par Madger · Paiement sécurisé Stripe</span>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.a
              href="#early-access"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-black"
              style={{ background: "#CBFF03" }}
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(203,255,3,0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              Créer ma page gratuitement
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
