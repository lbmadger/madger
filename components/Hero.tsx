"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 pt-24 lg:pt-32 pb-28 overflow-hidden text-center">

      {/* Background radial - animated pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(203,255,3,0.11), transparent 68%)" }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage: "radial-gradient(ellipse 100% 65% at 50% 25%, black, transparent 80%)",
          maskImage: "radial-gradient(ellipse 100% 65% at 50% 25%, black, transparent 80%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto w-full">

        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-medium mb-6 sm:mb-8"
          style={{ background: "rgba(203,255,3,0.07)", border: "1px solid rgba(203,255,3,0.22)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent glow-dot block" />
          <span style={{ color: "#CBFF03", fontSize: 11, letterSpacing: "0.06em" }}>
            Early access ouvert aux premiers coachs
          </span>
        </motion.div>

        {/* H1 */}
        <motion.h1
          className="font-extrabold text-white mb-5 sm:mb-6"
          style={{
            fontSize: "clamp(38px, 7.5vw, 92px)",
            letterSpacing: "-0.04em",
            lineHeight: 0.97,
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          L'app qui fait gagner<br />
          du{" "}<span className="text-shimmer">temps</span>{" "}aux coachs.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-text-muted leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto"
          style={{ fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22 }}
        >
          Un seul lien pour gérer vos réservations, paiements et factures.
          <br className="hidden sm:block" />
          Vos clients réservent en quelques secondes, vous gardez le contrôle.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32 }}
        >
          <motion.a
            href="#early-access"
            className="font-semibold text-sm px-8 py-4 rounded-full text-center"
            style={{ background: "#CBFF03", color: "#000" }}
            whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(203,255,3,0.5), 0 0 60px rgba(203,255,3,0.2)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            Rejoindre l'early access
          </motion.a>
          <motion.a
            href="#fonctionnement"
            className="text-white font-semibold text-sm px-8 py-4 rounded-full text-center"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.22)" }}
            transition={{ duration: 0.2 }}
          >
            Voir le fonctionnement
          </motion.a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm"
          style={{ color: "#5A5A5A" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="flex items-center gap-1.5"><Check />Sans engagement</span>
          <span className="flex items-center gap-1.5 hidden sm:flex"><Check />Configuration en 10 minutes</span>
          <span className="flex items-center gap-1.5"><Check />Gratuit pendant la beta</span>
        </motion.div>
      </div>

      {/* ── Scroll indicator premium (caché sur mobile) ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        {/* Icône souris */}
        <div
          style={{
            width: 22,
            height: 36,
            borderRadius: 12,
            border: "1.5px solid rgba(255,255,255,0.18)",
            display: "flex",
            justifyContent: "center",
            paddingTop: 7,
            position: "relative",
          }}
        >
          <motion.div
            style={{
              width: 3,
              height: 7,
              borderRadius: 2,
              background: "#CBFF03",
            }}
            animate={{ y: [0, 9, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Chevron animé */}
        <motion.svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          animate={{ y: [0, 3, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 4.5l-7 7-3-3" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
