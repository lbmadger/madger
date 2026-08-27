"use client";

import { useEffect, useState } from "react";
import MadgerLogo from "@/components/ui/MadgerLogo";
import MagneticButton from "@/components/ui/MagneticButton";


const LINKS = [
  { label: "Fonctionnement", href: "#fonctionnement" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Tarifs", href: "#tarifs" },
];

export default function Navbar({ launched = false }: { launched?: boolean }) {
  // Après le lancement, les CTA mènent directement à la création de compte.
  const ctaHref = launched ? "/signup" : "#early-access";
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

  // Le header n'est plus un bandeau collé en haut : c'est une pilule
  // flottante, détachée des bords. Le verre vit sur la pilule elle-même —
  // l'en-tête, lui, reste transparent et ne sert plus qu'à la positionner.
  // En haut de page elle se fait discrète ; au défilement elle se densifie
  // pour rester lisible au-dessus du contenu qui passe dessous.
  const pillStyle: React.CSSProperties = {
    background: scrolled || open ? "rgba(10,10,10,0.88)" : "rgba(18,18,18,0.55)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: `1px solid ${scrolled || open ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.07)"}`,
    boxShadow: scrolled
      ? "0 12px 40px rgba(0,0,0,0.6)"
      : "0 6px 24px rgba(0,0,0,0.35)",
    transition:
      "background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease",
  };

  // Traits du hamburger : transitions CSS pures (croix quand le menu est ouvert).
  const barBase: React.CSSProperties = {
    width: 16,
    transition: "transform 0.22s ease-in-out, opacity 0.18s ease",
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4 ${hidden && !open ? "-translate-y-[150%] md:translate-y-0" : "translate-y-0"}`}
      style={{ transition: "transform 0.35s ease" }}
    >
      {/* La pilule flotte : sans ce voile, le contenu qui défile serait
          tranché net au bord haut de l'écran, dans le jeu qui l'entoure.
          Le dégradé l'éteint juste avant. Inutile en haut de page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,5,0.92), rgba(5,5,5,0))",
          opacity: scrolled ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
      <div className="mx-auto max-w-5xl">
      {/* ── La pilule ── */}
      <div
        className="flex h-14 items-center justify-between gap-3 rounded-full pl-3 pr-3 sm:pl-4 sm:pr-4"
        style={pillStyle}
      >

        {/* Logo - square icon */}
        <a href="/" className="flex items-center flex-shrink-0" onClick={() => setOpen(false)}>
          <MadgerLogo size={36} />
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
          {/* Après le lancement : porte d'entrée discrète du client d'un
              coach (la landing vend aux coachs, lui cherche ses séances). */}
          {launched && (
            <a
              href="/espace"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#8A8A8A" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8A8A8A")}
            >
              Espace client
            </a>
          )}
        </nav>

        {/* CTA desktop + hamburger mobile */}
        <div className="flex items-center gap-3">
          {/* CTA desktop : survol en CSS pur (échelle + halo) */}
          <MagneticButton className="hidden md:inline-block" strength={0.5}>
            <a
              href={ctaHref}
              className="cta-shine inline-flex items-center text-sm font-semibold px-5 py-2.5 rounded-full transition-[transform,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-[0_0_22px_rgba(203,255,3,0.45)] active:scale-[0.97]"
              style={{ background: "#CBFF03", color: "#000" }}
            >
              {launched ? "Créer mon compte" : "Rejoindre l'accès anticipé"}
            </a>
          </MagneticButton>

          {/* CTA mobile compact */}
          <a
            href={ctaHref}
            className="md:hidden inline-flex items-center text-xs font-bold px-4 py-2 rounded-full"
            style={{ background: "#CBFF03", color: "#000", letterSpacing: "-0.01em" }}
            onClick={() => setOpen(false)}
          >
            {launched ? "Commencer" : "Accès anticipé"}
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
        className="mt-2 grid overflow-hidden rounded-3xl transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          background: open ? "rgba(10,10,10,0.92)" : "transparent",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: `1px solid ${open ? "rgba(255,255,255,0.10)" : "transparent"}`,
          boxShadow: open ? "0 16px 48px rgba(0,0,0,0.6)" : "none",
          transitionProperty: "grid-template-rows, opacity, visibility, background, border-color",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div className="flex flex-col gap-2 px-3 pb-4 pt-3">

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
              href={ctaHref}
              className={open ? "anim-fade-up flex items-center justify-center font-bold py-4 rounded-2xl text-black" : "flex items-center justify-center font-bold py-4 rounded-2xl text-black"}
              style={{
                background: "#CBFF03",
                fontSize: 16,
                animationDelay: open ? "0.2s" : undefined,
              }}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
            >
              {launched ? "Créer mon compte →" : "Rejoindre l'accès anticipé →"}
            </a>

            {/* Sous-texte */}
            <p
              className={open ? "anim-fade-in text-center text-xs" : "text-center text-xs"}
              style={{ color: "var(--text-dim)", animationDelay: open ? "0.26s" : undefined }}
            >
              Inscriptions ouvertes · Sans engagement
            </p>

            {/* Client d'un coach : accès discret à ses séances (lancé) */}
            {launched && (
              <a
                href="/espace"
                className={open ? "anim-fade-in text-center text-sm font-medium py-2" : "text-center text-sm font-medium py-2"}
                style={{ color: "#8A8A8A", animationDelay: open ? "0.3s" : undefined }}
                tabIndex={open ? undefined : -1}
                onClick={() => setOpen(false)}
              >
                Déjà client d&apos;un coach ? <span style={{ color: "#fff" }}>Mes séances →</span>
              </a>
            )}
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}
