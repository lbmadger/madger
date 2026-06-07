"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MobileCoachIntro — section mobile dédiée à la mascotte.
 *
 * Le personnage "parle" : une bulle de dialogue enchaîne plusieurs messages
 * automatiquement, et l'utilisateur peut taper pour passer au suivant.
 * Le perso flotte doucement (idle). Mobile uniquement (lg:hidden).
 */

const LINES = [
  "Salut 👋 Moi c'est le coach Madger.",
  "Résa, paiements, factures : je m'en occupe.",
  "Toi tu coaches. Le reste, c'est pour moi. 💪",
  "Prêt à arrêter de tout gérer à la main ?",
];

const EDGE_MASK =
  "radial-gradient(ellipse 74% 86% at 50% 46%, #000 58%, transparent 86%)";

export default function MobileCoachIntro() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  // Enchaînement automatique des répliques
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((v) => (v + 1) % LINES.length), 3600);
    return () => clearTimeout(t);
  }, [i, paused]);

  const next = () => {
    setI((v) => (v + 1) % LINES.length);
    // petite pause de l'auto-play après une interaction
    setPaused(true);
    setTimeout(() => setPaused(false), 6000);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
  };

  const isLast = i === LINES.length - 1;

  return (
    <section
      className="lg:hidden relative overflow-hidden px-5 pt-6 pb-12"
      style={{ background: "#0A0A0A" }}
      aria-label="Le coach Madger"
    >
      {/* Lueur d'ambiance */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 78%, rgba(203,255,3,0.09), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* ── Bulle de dialogue ── */}
        <div
          className="relative w-full flex justify-center mb-3"
          style={{ minHeight: 92 }}
        >
          <AnimatePresence mode="wait">
            <motion.button
              key={i}
              type="button"
              onClick={next}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative text-left max-w-[300px] w-full rounded-2xl px-4 py-3"
              style={{
                background: "linear-gradient(180deg, #181818, #121212)",
                border: "1px solid rgba(203,255,3,0.28)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#CBFF03",
                }}
              >
                Coach Madger
              </span>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "#fff",
                  marginTop: 3,
                  fontWeight: 600,
                }}
              >
                {LINES[i]}
              </p>

              {/* Petite queue de bulle pointant vers le perso */}
              <span
                className="absolute"
                style={{
                  bottom: -7,
                  left: "50%",
                  transform: "translateX(-50%) rotate(45deg)",
                  width: 14,
                  height: 14,
                  background: "#121212",
                  borderRight: "1px solid rgba(203,255,3,0.28)",
                  borderBottom: "1px solid rgba(203,255,3,0.28)",
                }}
              />
            </motion.button>
          </AnimatePresence>
        </div>

        {/* ── Personnage (flotte doucement, tap pour parler) ── */}
        <motion.button
          type="button"
          onClick={next}
          aria-label="Faire parler le coach"
          className="relative block"
          style={{ width: "min(74vw, 320px)" }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Halo derrière le personnage */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 52% 46% at 50% 44%, rgba(203,255,3,0.16), transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/character/madger-character.png"
            alt=""
            draggable={false}
            style={{
              position: "relative",
              width: "100%",
              height: "auto",
              display: "block",
              WebkitMaskImage: EDGE_MASK,
              maskImage: EDGE_MASK,
            }}
          />
        </motion.button>

        {/* ── Indicateurs + CTA ── */}
        <div className="relative flex items-center gap-1.5 mt-1 mb-5">
          {LINES.map((_, idx) => (
            <span
              key={idx}
              style={{
                height: 5,
                borderRadius: 999,
                background: idx === i ? "#CBFF03" : "rgba(255,255,255,0.16)",
                width: idx === i ? 18 : 5,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {isLast && (
            <motion.a
              href="#early-access"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
              className="font-bold text-sm px-7 py-3.5 rounded-full text-center"
              style={{ background: "#CBFF03", color: "#000" }}
            >
              Rejoindre l'early access →
            </motion.a>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
