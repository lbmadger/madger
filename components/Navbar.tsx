"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";
import MagneticButton from "@/components/ui/MagneticButton";


const LINKS = [
  { label: "Fonctionnement", href: "#fonctionnement" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Tarifs", href: "#tarifs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  // Header direction-aware : masqué quand on descend (le bouton collant en bas
  // prend le relais), ré-affiché quand on remonte ou en haut de page. La
  // translation n'est appliquée que sur mobile (cf. md:translate-y-0).
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (y < 80) setHidden(false);
      else if (y > lastY + 4) setHidden(true);
      else if (y < lastY - 4) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermer le menu si on passe en desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Bloquer le scroll quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const glassStyle: React.CSSProperties = {
    background: scrolled || open
      ? "rgba(5,5,5,0.96)"
      : "linear-gradient(to bottom, rgba(5,5,5,0.72), transparent)",
    backdropFilter: scrolled || open ? "blur(28px) saturate(180%)" : "blur(8px)",
    WebkitBackdropFilter: scrolled || open ? "blur(28px) saturate(180%)" : "blur(8px)",
    boxShadow: scrolled && !open ? "0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.6)" : "none",
    transition: "background 0.4s ease, box-shadow 0.4s ease, backdrop-filter 0.4s ease, transform 0.35s ease",
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${hidden && !open ? "-translate-y-full md:translate-y-0" : "translate-y-0"}`}
      style={glassStyle}
    >
      {/* ── Barre principale ── */}
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo - square icon */}
        <a href="/" className="flex items-center flex-shrink-0" onClick={() => setOpen(false)}>
          <MadgerLogo size={46} />
        </a>

        {/* Links desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#8A8A8A" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8A8A8A")}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA desktop + hamburger mobile */}
        <div className="flex items-center gap-3">
          {/* CTA desktop */}
          <MagneticButton className="hidden md:inline-block" strength={0.5}>
            <motion.a
              href="#early-access"
              className="cta-shine inline-flex items-center text-sm font-semibold px-5 py-2.5 rounded-full"
              style={{ background: "#CBFF03", color: "#000" }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 22px rgba(203,255,3,0.45)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              Rejoindre l'accès anticipé
            </motion.a>
          </MagneticButton>

          {/* CTA mobile compact */}
          <a
            href="#early-access"
            className="md:hidden inline-flex items-center text-xs font-bold px-4 py-2 rounded-full"
            style={{ background: "#CBFF03", color: "#000", letterSpacing: "-0.01em" }}
            onClick={() => setOpen(false)}
          >
            Accès anticipé
          </a>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl flex-shrink-0"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: open ? "rgba(255,255,255,0.06)" : "transparent",
              transition: "background 0.2s",
            }}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <motion.span
              className="block h-px bg-white rounded-full"
              style={{ width: 16, originX: 0.5, originY: 0.5 }}
              animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            />
            <motion.span
              className="block h-px bg-white rounded-full"
              style={{ width: 16 }}
              animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.18 }}
            />
            <motion.span
              className="block h-px bg-white rounded-full"
              style={{ width: 16, originX: 0.5, originY: 0.5 }}
              animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            />
          </button>
        </div>
      </div>

      {/* ── Menu mobile ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="px-5 pt-4 pb-8 flex flex-col gap-2">

              {/* Liens de navigation */}
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.06, duration: 0.28, ease: "easeOut" }}
                  className="flex items-center justify-between text-white font-medium py-3.5 px-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", fontSize: 16 }}
                  onClick={() => setOpen(false)}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                >
                  {l.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.a>
              ))}

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
                className="my-1"
                style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
              />

              {/* CTA principal */}
              <motion.a
                href="#early-access"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.28, ease: "easeOut" }}
                className="flex items-center justify-center font-bold py-4 rounded-2xl text-black"
                style={{ background: "#CBFF03", fontSize: 16 }}
                onClick={() => setOpen(false)}
              >
                Rejoindre l'accès anticipé →
              </motion.a>

              {/* Sous-texte */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.26 }}
                className="text-center text-xs"
                style={{ color: "#5A5A5A" }}
              >
                Inscriptions ouvertes · Sans engagement
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
