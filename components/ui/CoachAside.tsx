"use client";

import { motion } from "framer-motion";

/**
 * CoachAside — la mascotte qui "commente" une section existante.
 *
 * Posée dans un coin de la section (qui doit être position:relative), le coach
 * réagit avec une bulle contextuelle et pointe vers le contenu. Décoratif :
 * desktop uniquement, ne capte pas la souris, masqué aux lecteurs d'écran.
 *
 * Utilise les rendus détourés : coach-point.png / coach-ok.png / coach-cutout.png
 */

interface CoachAsideProps {
  /** Réplique affichée dans la bulle. */
  line: string;
  /** Image du coach (pose). */
  src?: string;
  /** Bord d'ancrage. */
  side?: "left" | "right";
  /** Largeur du coach en px (desktop). */
  width?: number;
  /** Décalage depuis le bord, en px. */
  inset?: number;
  /** Effet miroir (pour pointer vers le contenu). */
  flip?: boolean;
}

export default function CoachAside({
  line,
  src = "/character/coach-point.png",
  side = "right",
  width = 150,
  inset = 8,
  flip = false,
}: CoachAsideProps) {
  return (
    <motion.div
      aria-hidden="true"
      className="hidden lg:block absolute pointer-events-none select-none z-0"
      style={{ [side]: inset, width, bottom: -14 }}
      initial={{ y: 170, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", stiffness: 90, damping: 14, opacity: { duration: 0.3 } }}
    >
      {/* Bulle de dialogue */}
      <div
        className="relative mx-auto mb-2 rounded-2xl px-3 py-2"
        style={{
          maxWidth: 220,
          background: "linear-gradient(180deg, #181818, #121212)",
          border: "1px solid rgba(203,255,3,0.30)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#CBFF03" }}>
          Max · ton coach
        </span>
        <p style={{ fontSize: 13, lineHeight: 1.3, color: "#fff", marginTop: 1, fontWeight: 600 }}>
          {line}
        </p>
        {/* Queue */}
        <span
          className="absolute"
          style={{
            bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)",
            width: 12, height: 12, background: "#121212",
            borderRight: "1px solid rgba(203,255,3,0.30)", borderBottom: "1px solid rgba(203,255,3,0.30)",
          }}
        />
      </div>

      {/* Coach (flottement doux) */}
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Halo vert */}
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
          draggable={false}
          style={{
            position: "relative",
            width: "100%",
            height: "auto",
            display: "block",
            transform: flip ? "scaleX(-1)" : undefined,
            filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.5))",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
