"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import MadgerLogo from "@/components/ui/MadgerLogo";
import MagneticButton from "@/components/ui/MagneticButton";
import { useEarlyAccessFull } from "@/components/ui/useEarlyAccessFull";

const STEPS = [
  {
    num: "01",
    title: "Votre page coach",
    desc: "Un lien unique à partager partout. Votre profil, vos offres, votre image professionnelle.",
  },
  {
    num: "02",
    title: "Le client choisit sa séance",
    desc: "Il voit vos disponibilités, choisit son créneau et réserve en quelques secondes.",
  },
  {
    num: "03",
    title: "Paiement et confirmation",
    desc: "Stripe encaisse au moment de la réservation. Confirmation et facture envoyées automatiquement.",
  },
  {
    num: "04",
    title: "Son espace client",
    desc: "Votre client retrouve ses séances, sa facture et peut vous contacter depuis son dashboard.",
  },
];

export default function HeroScrollExperience() {
  // Accès anticipé complet → on bascule les CTA / badges du hero en liste d'attente.
  const full = useEarlyAccessFull();
  const ctaLabel = full ? "Rejoindre la liste d'attente" : "Rejoindre l'early access";

  // ── Scroll section refs ──────────────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const phoneWrapRef = useRef<HTMLDivElement>(null);

  // Screen refs (rendered once, stacked absolutely)
  const screen0Ref = useRef<HTMLDivElement>(null);
  const screen1Ref = useRef<HTMLDivElement>(null);
  const screen2Ref = useRef<HTMLDivElement>(null);
  const screen3Ref = useRef<HTMLDivElement>(null);

  // Desktop text panel refs
  const dHeroRef  = useRef<HTMLDivElement>(null);
  const dt0Ref    = useRef<HTMLDivElement>(null);
  const dt1Ref    = useRef<HTMLDivElement>(null);
  const dt2Ref    = useRef<HTMLDivElement>(null);
  const dt3Ref    = useRef<HTMLDivElement>(null);
  const dFinalRef = useRef<HTMLDivElement>(null);

  // Mobile text panel refs
  const mHeroRef  = useRef<HTMLDivElement>(null);
  const mt0Ref    = useRef<HTMLDivElement>(null);
  const mt1Ref    = useRef<HTMLDivElement>(null);
  const mt2Ref    = useRef<HTMLDivElement>(null);
  const mt3Ref    = useRef<HTMLDivElement>(null);
  const mFinalRef = useRef<HTMLDivElement>(null);

  const dCtaRef = useRef<HTMLDivElement>(null);
  const mCtaRef = useRef<HTMLDivElement>(null);
  const mDot0Ref = useRef<HTMLDivElement>(null);
  const mDot1Ref = useRef<HTMLDivElement>(null);
  const mDot2Ref = useRef<HTMLDivElement>(null);
  const mDot3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hauteurs verrouillées en px au mount : le layout ne bouge pas quand le
    // chrome du navigateur mobile (barre Instagram/TikTok) apparaît.
    const vh = window.innerHeight;
    const isMobile = window.innerWidth < 1024;
    if (stickyRef.current) stickyRef.current.style.height = `${vh}px`;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    const phone = phoneWrapRef.current;
    if (!section || !phone) return;

    // prefers-reduced-motion : pas de scroll-jacking de 350-500vh, la section
    // se replie sur un seul écran statique (téléphone + message final + CTA).
    section.style.height = reduced ? `${vh}px` : `${vh * (isMobile ? 3.5 : 5)}px`;

    const dTexts = [dHeroRef, dt0Ref, dt1Ref, dt2Ref, dt3Ref, dFinalRef].map((r) => r.current);
    const mTexts = [mt0Ref, mt1Ref, mt2Ref, mt3Ref, mFinalRef].map((r) => r.current);
    const screens = [screen0Ref, screen1Ref, screen2Ref, screen3Ref].map((r) => r.current);
    const dots = [mDot0Ref, mDot1Ref, mDot2Ref, mDot3Ref].map((r) => r.current);
    const dCta = dCtaRef.current;
    const mCta = mCtaRef.current;

    // Les bascules texte/écran/dots se font par franchissement de seuil :
    // on pose une transition CSS une fois, le navigateur fait le fondu.
    for (const el of [...dTexts, ...mTexts]) {
      if (el) el.style.transition = "opacity 0.45s ease, transform 0.45s ease";
    }
    for (const el of screens) {
      if (el) el.style.transition = "opacity 0.5s ease";
    }
    for (const el of dots) {
      if (el) el.style.transition = "width 0.25s ease, background-color 0.25s ease";
    }
    if (dCta) dCta.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    if (mCta) mCta.style.transition = "opacity 0.4s ease";
    // Jamais affiché pendant l'expérience (l'intro vit au-dessus, dans le hero)
    if (mHeroRef.current) mHeroRef.current.style.opacity = "0";

    const show = (el: HTMLElement | null, y = 0) => {
      if (!el) return;
      el.style.opacity = "1";
      el.style.transform = `translateY(${y}px)`;
      el.style.pointerEvents = "";
    };
    const hide = (el: HTMLElement | null, y = 0) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = `translateY(${y}px)`;
      el.style.pointerEvents = "none";
    };

    // Interpolation linéaire par morceaux sur des keyframes [position, valeur].
    const piecewise = (stops: [number, number][]) => (t: number) => {
      if (t <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const [t0, v0] = stops[i - 1];
          const [t1, v1] = stops[i];
          return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
        }
      }
      return stops[stops.length - 1][1];
    };

    // Chorégraphie du téléphone en "unités timeline" (mêmes repères que
    // l'ancienne timeline : desktop 0-22, mobile 0-15.5).
    const TOTAL = isMobile ? 15.5 : 22;
    const phoneTracks = isMobile
      ? {
          x: piecewise([[0, 0]]),
          // Moins de remontée (-6/-8 au lieu de -8/-17) et moins de
          // rétrécissement final (0.58 au lieu de 0.56) : le téléphone reste
          // bien centré, sans grand vide noir avant le texte final sur mobile.
          y: piecewise([[0, 0], [14, 0], [15.2, -2]]),
          scale: piecewise([[0, 0.66], [14, 0.66], [15.2, 0.58]]),
          rotY: piecewise([[0, 0]]),
          rotZ: piecewise([[0, 0]]),
          opacity: piecewise([[0, 1]]),
        }
      : {
          x: piecewise([[0, 28], [3, 12], [7, 12], [9.5, 10], [11.5, 10], [14, 14], [16, 14], [18.5, 11], [19.5, 11], [21.7, 0]]),
          y: piecewise([[0, 38], [3, 0], [19.5, 0], [21.7, 6]]),
          scale: piecewise([[0, 0.65], [3, 1], [19.5, 1], [21.7, 0.88]]),
          rotY: piecewise([[0, -14], [3, 0]]),
          rotZ: piecewise([[0, 3.5], [3, 0], [19.5, 0], [21.7, -0.5]]),
          opacity: piecewise([[0, 0], [2, 1]]),
        };

    const applyPhone = (t: number) => {
      phone.style.opacity = String(phoneTracks.opacity(t));
      phone.style.transform =
        `translate3d(${phoneTracks.x(t)}vw, ${phoneTracks.y(t)}vh, 0) ` +
        `scale(${phoneTracks.scale(t)}) rotateY(${phoneTracks.rotY(t)}deg) rotateZ(${phoneTracks.rotZ(t)}deg)`;
    };

    // Phases : desktop = intro, étapes 01-04, final ; mobile = étapes 01-04, final.
    const thresholds = isMobile ? [3, 7, 11, 14] : [3, 7, 11.5, 16, 19.5];
    const phaseCount = thresholds.length + 1;
    const screenForPhase = isMobile ? [0, 1, 2, 3, 3] : [0, 0, 1, 2, 3, 3];

    let currentPhase = -1;
    const setPhase = (phase: number) => {
      if (phase === currentPhase) return;
      const prev = currentPhase;
      currentPhase = phase;

      screens.forEach((el, i) => {
        if (el) el.style.opacity = screenForPhase[phase] === i ? "1" : "0";
      });

      if (isMobile) {
        mTexts.forEach((el, i) => (i === phase ? show(el) : hide(el, i > phase ? 12 : 0)));
        if (phase === phaseCount - 1) show(mCta); else hide(mCta);
        const active = Math.min(phase, 3);
        dots.forEach((el, i) => {
          if (!el) return;
          el.style.width = `${i === active ? 20 : 6}px`;
          el.style.backgroundColor = i === active ? "#CBFF03" : "rgba(255,255,255,0.15)";
        });
        // Haptique légère au changement d'écran (pas au chargement initial)
        if (prev !== -1 && !reduced && "vibrate" in navigator) navigator.vibrate(12);
      } else {
        dTexts.forEach((el, i) => (i === phase ? show(el) : hide(el, i > phase ? 22 : -18)));
        if (phase === phaseCount - 1) show(dCta); else hide(dCta, 16);
      }
    };

    const phaseFor = (t: number) => {
      let phase = 0;
      for (const th of thresholds) if (t >= th) phase++;
      return phase;
    };

    if (reduced) {
      applyPhone(TOTAL);
      setPhase(phaseCount - 1);
      return;
    }

    // Progression cible lue au scroll, progression affichée lissée en rAF
    // (équivalent du scrub : le téléphone "rattrape" le scroll en ~0,25 s).
    let target = 0;
    let displayed = 0;
    let raf = 0;
    let running = false;
    let lastTime = performance.now();

    // La boucle rAF ne tourne QUE tant que le téléphone rattrape le scroll,
    // puis s'arrête. À l'arrêt (lecture posée), plus aucune frame n'est
    // calculée : économie nette de CPU/batterie, déterminante sur mobile.
    const ensureRunning = () => {
      if (running) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const readScroll = () => {
      const rect = section.getBoundingClientRect();
      const span = section.offsetHeight - vh;
      target = Math.min(1, Math.max(0, span > 0 ? -rect.top / span : 0)) * TOTAL;
      setPhase(phaseFor(target));
      ensureRunning();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      displayed += (target - displayed) * Math.min(1, dt / 0.25);
      if (Math.abs(target - displayed) < 0.0005) {
        displayed = target;
        applyPhone(displayed);
        running = false; // arrivé à destination : on coupe jusqu'au prochain scroll
        return;
      }
      applyPhone(displayed);
      raf = requestAnimationFrame(tick);
    };

    readScroll();
    displayed = target;
    applyPhone(displayed);
    window.addEventListener("scroll", readScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", readScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HERO - static intro section above the scroll experience
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 pt-20 lg:pt-32 pb-14 lg:pb-28 overflow-hidden text-center">
        {/* Radial glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(203,255,3,0.11), transparent 68%)" }}
        />
        {/* Grid */}
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
          {/* Wordmark */}
          <motion.div
            className="flex justify-center mb-3 sm:mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src="/logo.png" alt="Madger" width={900} height={360} fetchPriority="high" style={{ height: "clamp(120px, 32vw, 150px)", width: "auto", objectFit: "contain", display: "block" }} />
          </motion.div>

          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-medium mb-4 sm:mb-8"
            style={{ background: "rgba(203,255,3,0.07)", border: "1px solid rgba(203,255,3,0.22)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent glow-dot block" />
            <span style={{ color: "#CBFF03", fontSize: 11, letterSpacing: "0.06em" }}>
              Inscriptions ouvertes · Accès anticipé gratuit
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            className="font-extrabold text-white mb-3 sm:mb-6"
            style={{ fontSize: "clamp(38px, 7.5vw, 92px)", letterSpacing: "-0.04em", lineHeight: 0.97 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            L'app <span className="text-shimmer">tout-en-un</span><br />
            des coachs indépendants.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-text-muted leading-relaxed mb-5 sm:mb-10 max-w-2xl mx-auto"
            style={{ fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.6 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
          >
            Réservation, paiement et facture réunis dans un seul lien à partager.{" "}
            <br className="hidden sm:block" />
            Vous coachez, Madger gère l'administratif.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-5 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
          >
            <MagneticButton className="w-full sm:w-auto" strength={0.45}>
              <motion.a
                href="#early-access"
                className="cta-shine block w-full sm:w-auto sm:inline-block font-semibold text-sm px-8 py-4 rounded-full text-center"
                style={{ background: "#CBFF03", color: "#000" }}
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(203,255,3,0.5), 0 0 60px rgba(203,255,3,0.2)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                {ctaLabel}
              </motion.a>
            </MagneticButton>
            <MagneticButton className="w-full sm:w-auto" strength={0.45}>
              <motion.a
                href="#fonctionnement"
                className="block w-full sm:w-auto sm:inline-block text-white font-semibold text-sm px-8 py-4 rounded-full text-center"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.22)" }}
                transition={{ duration: 0.2 }}
              >
                Voir le fonctionnement
              </motion.a>
            </MagneticButton>
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
            <span className="hidden sm:flex items-center gap-1.5"><Check />Accès sélectionné manuellement</span>
            <span className="flex items-center gap-1.5"><Check />{full ? "Accès anticipé complet" : "Plan Pro offert 3 mois"}</span>
          </motion.div>
        </div>

        {/* Scroll mouse indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          <div style={{ width: 22, height: 36, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.18)", display: "flex", justifyContent: "center", paddingTop: 7 }}>
            <motion.div
              style={{ width: 3, height: 7, borderRadius: 2, background: "#CBFF03" }}
              animate={{ y: [0, 9, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <motion.svg
            width="12" height="8" viewBox="0 0 12 8" fill="none"
            animate={{ y: [0, 3, 0], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M1 1.5L6 6.5L11 1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SCROLL EXPERIENCE - 350vh mobile / 500vh desktop
      ══════════════════════════════════════════════════════ */}
      <section
        ref={sectionRef}
        id="fonctionnement"
        className="h-[350vh] lg:h-[500vh]"
        style={{ position: "relative" }}
      >
        <div
          ref={stickyRef}
          style={{
            position: "sticky",
            top: 0,
            height: "100dvh",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 65% 60% at 62% 50%, rgba(203,255,3,0.055), transparent 70%)" }}
          />

          {/* ── DESKTOP text panel - left column (hidden on mobile) ── */}
          <div
            className="hidden lg:flex absolute"
            style={{ left: 0, top: 0, bottom: 0, width: "44%", alignItems: "center", paddingLeft: "clamp(24px, 5vw, 72px)" }}
          >
            <div style={{ position: "relative", width: "100%", maxWidth: 380, height: 240 }}>

              {/* Hero intro */}
              <div ref={dHeroRef} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                <SectionLabel>Comment ça marche</SectionLabel>
                <p style={{ fontSize: 17, color: "#8A8A8A", lineHeight: 1.6, marginTop: 4 }}>
                  Suivez le scroll pour découvrir comment Madger automatise votre quotidien.
                </p>
              </div>

              {/* Step texts */}
              {STEPS.map((step, i) => {
                const refs = [dt0Ref, dt1Ref, dt2Ref, dt3Ref];
                return (
                  <div key={i} ref={refs[i]} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#CBFF03", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                      {step.num}
                    </div>
                    <h3 style={{ fontSize: "clamp(22px, 2.6vw, 34px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 14 }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 16, color: "#8A8A8A", lineHeight: 1.65, maxWidth: 340 }}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}

              {/* Final desktop */}
              <div ref={dFinalRef} style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                <div style={{ fontSize: "clamp(28px, 3.2vw, 44px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 22 }}>
                  Un lien.<br />Une séance.<br />C'est tout.
                </div>
                <div ref={dCtaRef}>
                  <a
                    href="#early-access"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "#CBFF03",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "14px 28px",
                      borderRadius: 100,
                      textDecoration: "none",
                    }}
                  >
                    {ctaLabel} →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── DOTS PROGRESSION MOBILE ── */}
          <div className="flex lg:hidden" style={{
            position: "absolute",
            top: 24,
            left: 0,
            right: 0,
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            zIndex: 2,
            pointerEvents: "none",
          }}>
            {[mDot0Ref, mDot1Ref, mDot2Ref, mDot3Ref].map((ref, i) => (
              <div key={i} ref={ref} style={{
                height: 6,
                borderRadius: 999,
                background: i === 0 ? "#CBFF03" : "rgba(255,255,255,0.15)",
                width: i === 0 ? 20 : 6,
                transition: "none",
              }} />
            ))}
          </div>


          {/* ── PHONE - single instance, centered, GSAP moves it ── */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              perspective: "1400px",
              zIndex: 2,
            }}
          >
            <div
              ref={phoneWrapRef}
              style={{ willChange: "transform, opacity", transformStyle: "preserve-3d" }}
            >
              <IPhoneFrame
                screen0Ref={screen0Ref}
                screen1Ref={screen1Ref}
                screen2Ref={screen2Ref}
                screen3Ref={screen3Ref}
              />
            </div>
          </div>

          {/* ── MOBILE text panel - bottom center (hidden on desktop) ── */}
          <div
            className="flex lg:hidden"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column",
              alignItems: "center",
              paddingBottom: 32,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            <div style={{ position: "relative", width: "100%", maxWidth: 320, height: 110, textAlign: "center" }}>

              {/* Mobile hero */}
              <div ref={mHeroRef} style={{ position: "absolute", inset: 0 }}>
                <SectionLabel>Comment ça marche</SectionLabel>
              </div>

              {/* Mobile step texts */}
              {STEPS.map((step, i) => {
                const refs = [mt0Ref, mt1Ref, mt2Ref, mt3Ref];
                return (
                  <div key={i} ref={refs[i]} style={{ position: "absolute", inset: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#CBFF03", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>
                      {step.num}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8 }}>
                      {step.title}
                    </div>
                    <p style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.55 }}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}

              {/* Mobile final */}
              <div ref={mFinalRef} style={{ position: "absolute", inset: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 14 }}>
                  Un lien. Une séance.<br />C'est tout.
                </div>
                <div ref={mCtaRef}>
                  <a
                    href="#early-access"
                    style={{
                      display: "inline-flex",
                      background: "#CBFF03",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "12px 24px",
                      borderRadius: 100,
                      textDecoration: "none",
                    }}
                  >
                    {ctaLabel} →
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   IPHONE FRAME - screens are stacked absolutely, GSAP controls opacity
══════════════════════════════════════════════════════════ */
interface IPhoneFrameProps {
  screen0Ref: React.RefObject<HTMLDivElement>;
  screen1Ref: React.RefObject<HTMLDivElement>;
  screen2Ref: React.RefObject<HTMLDivElement>;
  screen3Ref: React.RefObject<HTMLDivElement>;
}

function IPhoneFrame({ screen0Ref, screen1Ref, screen2Ref, screen3Ref }: IPhoneFrameProps) {
  return (
    <div style={{ position: "relative", width: 280, height: 580 }}>
      {/* Glow shadow */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-52 h-10 rounded-full blur-2xl"
        style={{ background: "rgba(203,255,3,0.28)" }}
      />

      {/* Phone shell */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 50,
          background: "linear-gradient(160deg, #2C2C2E 0%, #1C1C1E 50%, #111 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 50px 120px rgba(0,0,0,0.9), 0 0 80px rgba(203,255,3,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
          padding: 10,
        }}
      >
        {/* Physical buttons */}
        <div style={{ position: "absolute", left: -3, top: 72, width: 3, height: 20, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -3, top: 104, width: 3, height: 32, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -3, top: 146, width: 3, height: 32, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", right: -3, top: 118, width: 3, height: 52, background: "#2A2A2C", borderRadius: "0 2px 2px 0" }} />

        {/* Screen area */}
        <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", borderRadius: 42, background: "#0A0A0A" }}>

          {/* Dynamic Island */}
          <div style={{ position: "absolute", zIndex: 20, top: 14, left: "50%", transform: "translateX(-50%)", width: 108, height: 30, background: "#000", borderRadius: 20 }} />

          {/* Status bar - time left, wifi + battery right (cellular bars removed) */}
          <div style={{ position: "absolute", zIndex: 10, top: 0, left: 0, right: 0, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>9:41</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="14" height="10" viewBox="0 0 13 10" fill="none">
                <circle cx="6.5" cy="8.8" r="1.1" fill="white" />
                <path d="M3 5.8C4 4.8 5.2 4.2 6.5 4.2C7.8 4.2 9 4.8 10 5.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
                <path d="M0.5 3C2.3 1.2 4.3 0.2 6.5 0.2C8.7 0.2 10.7 1.2 12.5 3" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
              </svg>
              <div style={{ position: "relative", width: 22, height: 11 }}>
                <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.4)", borderRadius: 2.8 }} />
                <div style={{ position: "absolute", left: 1.5, top: 1.5, bottom: 1.5, right: 4, background: "#CBFF03", borderRadius: 1.2 }} />
                <div style={{ position: "absolute", right: -2.5, top: "50%", transform: "translateY(-50%)", width: 1.5, height: 5, background: "rgba(255,255,255,0.45)", borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Screens - stacked, opacity controlled by GSAP */}
          <div ref={screen0Ref} style={{ position: "absolute", inset: 0 }}><ScreenProfile /></div>
          <div ref={screen1Ref} style={{ position: "absolute", inset: 0 }}><ScreenSeance /></div>
          <div ref={screen2Ref} style={{ position: "absolute", inset: 0 }}><ScreenPaiement /></div>
          <div ref={screen3Ref} style={{ position: "absolute", inset: 0 }}><ScreenDashboard /></div>

          {/* Screen glare */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 42, background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)", pointerEvents: "none" }} />
        </div>

        {/* Shell glare */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 50, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SCREEN COMPONENTS (unchanged from PhoneShowcase)
══════════════════════════════════════════════════════════ */

function ScreenProfile() {
  return (
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 14px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 8, fontFamily: "monospace" }}>
          madger.app/<span style={{ color: "#CBFF03" }}>marie</span>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", marginBottom: 7, border: "2px solid rgba(203,255,3,0.35)", boxShadow: "0 0 18px rgba(203,255,3,0.18)" }}>
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=140&h=140&fit=crop&auto=format&q=85" alt="Marie" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Marie Laurent</div>
        <div style={{ fontSize: 10, color: "#8A8A8A", marginBottom: 4 }}>Coach sportif · Paris 11e</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}>
          {[1,2,3,4,5].map(i => (
            <svg key={i} width="9" height="9" viewBox="0 0 10 10">
              <path d="M5 1L6.2 3.8H9L6.7 5.6L7.6 8.5L5 6.8L2.4 8.5L3.3 5.6L1 3.8H3.8L5 1Z" fill="#CBFF03" />
            </svg>
          ))}
          <span style={{ fontSize: 9, color: "#8A8A8A", marginLeft: 2 }}>4.9 · 38 avis</span>
        </div>
        <div style={{ fontSize: 9, color: "#8A8A8A", lineHeight: 1.5, maxWidth: 210, marginBottom: 8 }}>
          Spécialisée en remise en forme et prépa physique. Séances en présentiel ou visio.
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 14px 8px" }} />
      <div style={{ padding: "0 14px", flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A5A5A", marginBottom: 6 }}>Séances disponibles</div>
        {[
          { n: "Découverte", d: "45 min", t: "Visio", p: "Gratuit" },
          { n: "Coaching individuel", d: "60 min", t: "Présentiel", p: "50 €", a: true },
          { n: "Suivi mensuel", d: "4 séances", t: "Présentiel", p: "160 €" },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, border: s.a ? "1px solid #CBFF03" : "1px solid rgba(255,255,255,0.06)", background: s.a ? "rgba(203,255,3,0.05)" : "transparent", marginBottom: 5 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>{s.n}</div>
              <div style={{ fontSize: 9, color: "#8A8A8A", marginTop: 1 }}>{s.d} · {s.t}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#CBFF03" }}>{s.p}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px 16px" }}>
        <div style={{ width: "100%", padding: "11px", borderRadius: 100, background: "#CBFF03", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>
          Réserver une séance
        </div>
      </div>
    </div>
  );
}

function ScreenSeance() {
  return (
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column", padding: "52px 14px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 10, color: "#8A8A8A" }}>Retour</span>
        </div>
        <MadgerLogo size={22} />
      </div>
      <div style={{ padding: "11px", borderRadius: 13, background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.2)", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Coaching individuel</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
          {["60 min","Présentiel","Paris 11e"].map(t => (
            <span key={t} style={{ fontSize: 8, color: "#8A8A8A", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 20 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 9, color: "#8A8A8A", lineHeight: 1.5, marginBottom: 6 }}>
          Séance personnalisée en salle ou en plein air selon vos objectifs.
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#CBFF03" }}>50 €</div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A5A5A", marginBottom: 6 }}>Sélectionner une date</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, marginBottom: 8 }}>
        {[["L","7"],["M","8"],["M","9"],["J","10"],["V","11"]].map(([d, n], i) => (
          <div key={i} style={{ padding: "5px 0", borderRadius: 7, textAlign: "center", background: i === 2 ? "#CBFF03" : "transparent", color: i === 2 ? "#000" : "#8A8A8A", border: i === 2 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 8 }}>{d}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{n}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A5A5A", marginBottom: 6 }}>Créneaux disponibles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
        {["9:00","10:00","11:00","14:00","15:00","17:00"].map((h) => (
          <div key={h} style={{ padding: "7px 0", borderRadius: 7, textAlign: "center", fontSize: 10, fontWeight: h === "10:00" ? 600 : 400, background: h === "10:00" ? "#CBFF03" : "transparent", color: h === "10:00" ? "#000" : "#8A8A8A", border: h === "10:00" ? "none" : "1px solid rgba(255,255,255,0.06)" }}>{h}</div>
        ))}
      </div>
      <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#5A5A5A"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" /></svg>
        <div>
          <div style={{ fontSize: 9, color: "#fff", fontWeight: 500 }}>Salle BodyFit</div>
          <div style={{ fontSize: 8, color: "#5A5A5A" }}>14 rue de la Roquette, Paris 11e</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 0 14px" }}>
        <div style={{ width: "100%", padding: "10px", borderRadius: 100, background: "#CBFF03", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>
          Confirmer · Mer. 9 mai · 10:00
        </div>
      </div>
    </div>
  );
}

function ScreenPaiement() {
  return (
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column", padding: "52px 14px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Paiement</div>
        <MadgerLogo size={22} />
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: "#8A8A8A", marginBottom: 5 }}>Récapitulatif</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Coaching individuel</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03" }}>50 €</div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "5px 0" }} />
        <div style={{ fontSize: 9, color: "#8A8A8A" }}>Mer. 9 mai · 10:00 · Présentiel · Paris 11e</div>
        <div style={{ fontSize: 9, color: "#8A8A8A", marginTop: 1 }}>avec Marie Laurent</div>
      </div>
      <div style={{ fontSize: 9, color: "#5A5A5A", textAlign: "center", marginBottom: 6 }}>Paiement rapide</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
        <div style={{ padding: "8px", borderRadius: 10, background: "#000", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="44" height="19" viewBox="0 0 56 24" fill="none">
            <path d="M13.6 8.1c-.1-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5-.5 0-1.2-.5-2-.5-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.6.8 6.1.5.7 1.1 1.6 1.9 1.5.8 0 1-.5 1.9-.5.9 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.5.6-.8.8-1.7.8-1.7 0 0-1.5-.6-1.5-2.4zM12 3.5c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8z" fill="#fff"/>
            <text x="18" y="16.5" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif" fontSize="14" fontWeight="500" letterSpacing="-0.3" fill="#fff">Pay</text>
          </svg>
        </div>
        <div style={{ padding: "8px", borderRadius: 10, background: "#fff", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="48" height="19" viewBox="0 0 62 24" fill="none">
            <path d="M19.6 12.2c0-.6-.05-1.1-.16-1.6H12v3.1h4.3c-.18 1-.74 1.85-1.58 2.42v2.02h2.55c1.5-1.38 2.33-3.42 2.33-5.94z" fill="#4285F4"/>
            <path d="M12 20c2.16 0 3.97-.72 5.3-1.94l-2.55-2.02c-.71.48-1.62.76-2.75.76-2.12 0-3.91-1.43-4.55-3.35H4.8v2.08C6.13 18.18 8.86 20 12 20z" fill="#34A853"/>
            <path d="M7.45 13.45c-.16-.48-.25-1-.25-1.53s.09-1.05.25-1.53V8.31H4.8C4.29 9.34 4 10.5 4 11.92s.29 2.58.8 3.61l2.65-2.08z" fill="#FBBC05"/>
            <path d="M12 6.58c1.2 0 2.27.41 3.11 1.22l2.33-2.33C16.04 4.18 14.23 3.42 12 3.42 8.86 3.42 6.13 5.24 4.8 7.96l2.65 2.08C8.09 8.12 9.88 6.58 12 6.58z" fill="#EA4335"/>
            <text x="22" y="16.5" fontFamily="'Product Sans','Google Sans',-apple-system,sans-serif" fontSize="14" fontWeight="500" letterSpacing="-0.2" fill="#3c4043">Pay</text>
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <span style={{ fontSize: 9, color: "#5A5A5A" }}>ou par carte</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", marginBottom: 5 }}>
        <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 3 }}>Numéro de carte</div>
        <div style={{ fontSize: 12, color: "#fff", letterSpacing: "0.1em" }}>•••• •••• •••• 4242</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 7 }}>
        {[["Expiration","12 / 27"],["CVC","•••"]].map(([l, v]) => (
          <div key={l} style={{ padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 11, color: "#fff" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 11px", borderRadius: 10, background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.15)", marginBottom: 7, display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(203,255,3,0.15)", border: "1px solid rgba(203,255,3,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="8" height="7" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#CBFF03" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#CBFF03" }}>Confirmation et facture par email</div>
          <div style={{ fontSize: 8, color: "#8A8A8A" }}>Envoyées automatiquement</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: "#5A5A5A", textAlign: "center", marginBottom: 7, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#5A5A5A" strokeWidth="2" /></svg>
        Paiement sécurisé par Stripe
      </div>
      <div style={{ padding: "10px", borderRadius: 100, background: "#CBFF03", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>Payer 50 €</div>
    </div>
  );
}

function ScreenDashboard() {
  return (
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "6px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <MadgerLogo size={24} />
          <div>
            <div style={{ fontSize: 9, color: "#8A8A8A" }}>Bonjour,</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Léonard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Notif bell */}
          <div style={{ position: "relative", width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round"/></svg>
            <div style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: "#CBFF03", border: "1px solid #0A0A0A" }} />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.15)" }}>
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format&q=80" alt="Léonard" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

      {/* Scrollable content */}
      <div className="phone-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 7 }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {[["12","Séances"],["600 €","Total"],["2","Ce mois"]].map(([v, l]) => (
            <div key={l} style={{ padding: "7px 6px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 7, color: "#8A8A8A", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Prochaine séance */}
        <div style={{ padding: "9px 10px", borderRadius: 12, background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5A5A5A" }}>Prochaine séance</div>
            <div style={{ padding: "3px 7px", borderRadius: 20, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.2)", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 7, color: "#CBFF03", fontWeight: 600, lineHeight: 1 }}>Dans 2 jours</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1.5px solid rgba(203,255,3,0.4)" }}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format&q=80" alt="Marie" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>Coaching individuel</div>
              <div style={{ fontSize: 8, color: "#8A8A8A" }}>Marie Laurent</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#CBFF03" }}>50 €</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {[["📅","Mer. 9 mai"],["🕙","10:00"],["📍","Paris 11e"]].map(([ic, v]) => (
              <div key={v} style={{ padding: "4px 5px", borderRadius: 6, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#fff", fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          {/* Ajouter au calendrier */}
          <div style={{ marginTop: 6, padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#8A8A8A" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 8, color: "#8A8A8A" }}>Ajouter à mon calendrier</span>
          </div>
        </div>

        {/* Factures */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5A5A5A" }}>Factures</div>
            <span style={{ fontSize: 8, color: "#CBFF03" }}>Voir tout</span>
          </div>
          {[
            { ref: "FAC-024", date: "2 mai", montant: "50 €" },
            { ref: "FAC-023", date: "25 avr.", montant: "50 €" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(203,255,3,0.08)", border: "1px solid rgba(203,255,3,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#CBFF03" strokeWidth="2"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#fff", fontWeight: 500 }}>{f.ref}</div>
                  <div style={{ fontSize: 7, color: "#8A8A8A" }}>{f.date} · Coaching individuel</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{f.montant}</div>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#5A5A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          ))}
        </div>

        {/* Historique */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5A5A5A" }}>Historique</div>
            <span style={{ fontSize: 8, color: "#CBFF03" }}>Voir tout</span>
          </div>
          {[
            { label: "Coaching individuel", date: "Mer. 2 mai", montant: "50 €", done: true },
            { label: "Coaching individuel", date: "Mer. 25 avr.", montant: "50 €", done: true },
            { label: "Séance découverte", date: "Mer. 18 avr.", montant: "Gratuit", done: true },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 3 }}>
              <div>
                <div style={{ fontSize: 9, color: "#fff", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 7, color: "#8A8A8A" }}>{s.date} · {s.montant}</div>
              </div>
              <div style={{ padding: "2px 6px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 7, color: "#4ADE80", fontWeight: 600, lineHeight: 1 }}>Terminée</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contacter le coach */}
        <div style={{ padding: "9px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format&q=80" alt="Marie" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#fff" }}>Marie Laurent</div>
            <div style={{ fontSize: 7, color: "#8A8A8A" }}>Votre coach</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .82h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" stroke="#CBFF03" strokeWidth="2"/></svg>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#8A8A8A" strokeWidth="2"/></svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Shared helpers ───────────────────────────────────── */
function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 4.5l-7 7-3-3" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
