"use client";

import { useEffect, useState } from "react";
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

  // Traits du hamburger : transitions CSS pures (croix quand le menu est ouvert).
  const barBase: React.CSSProperties = {
    width: 16,
    transition: "transform 0.22s ease-in-out, opacity 0.18s ease",
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
          {/* CTA desktop : survol en CSS pur (échelle + halo) */}
          <MagneticButton className="hidden md:inline-block" strength={0.5}>
            <a
              href="#early-access"
              className="cta-shine inline-flex items-center text-sm font-semibold px-5 py-2.5 rounded-full transition-[transform,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-[0_0_22px_rgba(203,255,3,0.45)] active:scale-[0.97]"
              style={{ background: "#CBFF03", color: "#000" }}
            >
              Rejoindre l'accès anticipé
            </a>
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
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span
              className="block h-px bg-white rounded-full"
              style={{ ...barBase, transform: open ? "translateY(6px) rotate(45deg)" : "none" }}
            />
            <span
              className="block h-px bg-white rounded-full"
              style={{ ...barBase, opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "none" }}
            />
            <span
              className="block h-px bg-white rounded-full"
              style={{ ...barBase, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }}
            />
          </button>
        </div>
      </div>

      {/* ── Menu mobile ── */}
      {/* Dépliage en CSS pur : grid-template-rows 0fr → 1fr suit la hauteur
          réelle du contenu. Les liens restent inertes quand c'est fermé
          (visibility hidden via aria-hidden + contenu replié). */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          borderTop: open ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
          visibility: open ? "visible" : "hidden",
          transitionProperty: "grid-template-rows, opacity, visibility",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div className="px-5 pt-4 pb-8 flex flex-col gap-2">

            {/* Liens de navigation (léger décalage en cascade à l'ouverture) */}
            {LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className={open ? "anim-slide-in flex items-center justify-between text-white font-medium py-3.5 px-4 rounded-xl" : "flex items-center justify-between text-white font-medium py-3.5 px-4 rounded-xl"}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 16,
                  animationDelay: open ? `${0.04 + i * 0.06}s` : undefined,
                }}
                tabIndex={open ? undefined : -1}
                onClick={() => setOpen(false)}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              >
                {l.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}

            {/* Divider */}
            <div
              className="my-1"
              style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
            />

            {/* CTA principal */}
            <a
              href="#early-access"
              className={open ? "anim-fade-up flex items-center justify-center font-bold py-4 rounded-2xl text-black" : "flex items-center justify-center font-bold py-4 rounded-2xl text-black"}
              style={{
                background: "#CBFF03",
                fontSize: 16,
                animationDelay: open ? "0.2s" : undefined,
              }}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
            >
              Rejoindre l'accès anticipé →
            </a>

            {/* Sous-texte */}
            <p
              className={open ? "anim-fade-in text-center text-xs" : "text-center text-xs"}
              style={{ color: "var(--text-dim)", animationDelay: open ? "0.26s" : undefined }}
            >
              Inscriptions ouvertes · Sans engagement
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
