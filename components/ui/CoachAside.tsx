"use client";

import { motion } from "framer-motion";

/**
 * CoachAside - Léo, la mascotte qui "commente" une section existante.
 *
 * Posé dans un coin de la section (qui doit être position:relative + overflow-hidden),
 * Léo surgit de derrière le bord, réagit avec une bulle et pointe vers le contenu.
 * Décoratif : ne capte pas la souris, masqué aux lecteurs d'écran. Mobile + desktop.
 */

interface CoachAsideProps {
  line: string;
  src?: string;
  side?: "left" | "right";
  inset?: number;
  flip?: boolean;
}

export default function CoachAside({
  line,
  src = "/character/coach-point.webp",
  side = "right",
  inset = 8,
  flip = false,
}: CoachAsideProps) {
  const innerAnchor = side === "right" ? { right: 0 } : { left: 0 };

  return (
    // Rail centré aligné sur la largeur du contenu (max-w-6xl) : sur grand
    // écran, Léo reste près des cartes au lieu de se coller au bord du
    // viewport. Hauteur nulle : ne change rien au flux de la section.
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 pointer-events-none z-0">
      <div className="relative max-w-6xl mx-auto" style={{ height: 0 }}>
        <motion.div
          className="absolute pointer-events-none select-none w-[84px] lg:w-[150px]"
          style={{ [side]: inset, bottom: -14 }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 15, opacity: { duration: 0.4 } }}
        >
      <div className="relative w-full">
        {/* Bulle - ancrée vers l'intérieur pour rester à l'écran */}
        <div
          className="absolute rounded-xl px-2.5 py-1.5 lg:px-3 lg:py-2"
          style={{
            bottom: "100%",
            marginBottom: 6,
            ...innerAnchor,
            width: "max-content",
            maxWidth: 168,
            background: "linear-gradient(180deg, #181818, #121212)",
            border: "1px solid rgba(203,255,3,0.30)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#CBFF03", display: "block" }}>
            Léo
          </span>
          <p style={{ fontSize: 12, lineHeight: 1.25, color: "#fff", marginTop: 1, fontWeight: 600 }}>
            {line}
          </p>
          {/* Queue */}
          <span
            className="absolute"
            style={{
              bottom: -5,
              [side === "right" ? "right" : "left"]: 22,
              transform: "rotate(45deg)",
              width: 11, height: 11, background: "#121212",
              borderRight: "1px solid rgba(203,255,3,0.30)",
              borderBottom: "1px solid rgba(203,255,3,0.30)",
            }}
          />
        </div>

        {/* Léo (flottement doux) */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 42% 50% at 50% 52%, rgba(203,255,3,0.16), transparent 66%)",
              filter: "blur(8px)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            style={{
              position: "relative",
              width: "100%",
              height: "auto",
              display: "block",
              transform: flip ? "scaleX(-1)" : undefined,
              filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.5))",
            }}
          />
          </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
