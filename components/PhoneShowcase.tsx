"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const STEPS = [
  { num: "01", title: "Votre page coach", desc: "Un lien unique à partager partout. Votre profil, vos offres, votre image professionnelle." },
  { num: "02", title: "Le client choisit sa séance", desc: "Il voit vos disponibilités, choisit son créneau et réserve en quelques secondes." },
  { num: "03", title: "Paiement et confirmation", desc: "Stripe encaisse au moment de la réservation. Confirmation et facture envoyées automatiquement." },
  { num: "04", title: "Son espace client", desc: "Votre client retrouve ses séances, sa facture et peut vous contacter depuis son dashboard." },
];

export default function PhoneShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [activeScreen, setActiveScreen] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 20 });
  const rotateY = useTransform(smoothX, [-1, 1], [-10, 10]);
  const rotateX = useTransform(smoothY, [-1, 1], [6, -6]);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsTouchDevice(window.matchMedia("(hover: none)").matches);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = stickyRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2))));
      mouseY.set(Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2))));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, isTouchDevice]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const total = sectionRef.current.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / total));
      if (rect.top < window.innerHeight * 0.75) setIsVisible(true);
      if (progress < 0.25) setActiveScreen(0);
      else if (progress < 0.5) setActiveScreen(1);
      else if (progress < 0.75) setActiveScreen(2);
      else setActiveScreen(3);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scale factor for mobile: phone stays 280×580 internally but rendered at 75%
  const phoneScale = isMobile ? 0.75 : 1;
  const displayW = Math.round(280 * phoneScale);
  const displayH = Math.round(580 * phoneScale);

  return (
    <section ref={sectionRef} style={{ height: "320vh", position: "relative" }}>
      <div
        ref={stickyRef}
        style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 65% 50%, rgba(203,255,3,0.05), transparent 70%)" }}
        />

        <div className="max-w-6xl mx-auto px-6 w-full">

          {/* ─── MOBILE LAYOUT ─── */}
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>

              <SectionLabel>Comment ça marche</SectionLabel>

              {/* Phone — scaled down, simple entrance */}
              <div style={{ perspective: "1200px" }}>
                <motion.div
                  initial={{ opacity: 0, y: 60, scale: 0.85, rotateX: 12 }}
                  animate={isVisible ? { opacity: 1, y: 0, scale: 1, rotateX: 0 } : {}}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Wrapper at display size, inner phone at native size + scale */}
                    <div style={{ width: displayW, height: displayH, position: "relative" }}>
                      <div style={{
                        width: 280,
                        height: 580,
                        transform: `scale(${phoneScale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                      }}>
                        <IPhone activeScreen={activeScreen} />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Step indicator dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: activeScreen === i ? 22 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: activeScreen === i ? "#CBFF03" : "rgba(255,255,255,0.15)",
                      transition: "all 0.4s ease",
                    }}
                  />
                ))}
              </div>

              {/* Active step text */}
              <div style={{ width: "100%", maxWidth: 300, textAlign: "center" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScreen}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 5, letterSpacing: "-0.01em" }}>
                      <span style={{ color: "#CBFF03", marginRight: 6 }}>{STEPS[activeScreen].num}</span>
                      {STEPS[activeScreen].title}
                    </div>
                    <div style={{ fontSize: 12, color: "#8A8A8A", lineHeight: 1.55 }}>
                      {STEPS[activeScreen].desc}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          ) : (

            /* ─── DESKTOP LAYOUT ─── */
            <div className="grid grid-cols-2 gap-20 items-center">

              {/* Steps list */}
              <div>
                <SectionLabel>Comment ça marche</SectionLabel>
                <div className="flex flex-col gap-8">
                  {STEPS.map((step, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: activeScreen === i ? 1 : 0.2 }}
                      transition={{ duration: 0.5 }}
                      className="flex gap-4"
                    >
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500"
                        style={{
                          background: activeScreen === i ? "#CBFF03" : "rgba(203,255,3,0.08)",
                          color: activeScreen === i ? "#000" : "#CBFF03",
                          border: activeScreen === i ? "none" : "1px solid rgba(203,255,3,0.2)",
                          boxShadow: activeScreen === i ? "0 0 20px rgba(203,255,3,0.4)" : "none",
                        }}
                      >
                        {step.num}
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
                          {step.title}
                        </h3>
                        <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Phone — full 3D on desktop */}
              <div className="flex justify-end" style={{ perspective: "1400px" }}>
                <motion.div
                  initial={{ rotateY: -55, scale: 0.75, opacity: 0, y: 100 }}
                  animate={isVisible ? { rotateY: 0, scale: 1, opacity: 1, y: 0 } : {}}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                      <IPhone activeScreen={activeScreen} />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>

            </div>
          )}

        </div>
      </div>
    </section>
  );
}

function IPhone({ activeScreen }: { activeScreen: number }) {
  return (
    <div className="relative" style={{ width: 280, height: 580 }}>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-52 h-10 rounded-full blur-2xl" style={{ background: "rgba(203,255,3,0.3)" }} />
      <div
        className="relative w-full h-full"
        style={{
          borderRadius: 50,
          background: "linear-gradient(160deg, #2C2C2E 0%, #1C1C1E 50%, #111 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 50px 120px rgba(0,0,0,0.9), 0 0 80px rgba(203,255,3,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
          padding: 10,
        }}
      >
        {/* Side buttons */}
        <div className="absolute" style={{ left: -3, top: 72, width: 3, height: 20, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div className="absolute" style={{ left: -3, top: 104, width: 3, height: 32, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div className="absolute" style={{ left: -3, top: 146, width: 3, height: 32, background: "#2A2A2C", borderRadius: "2px 0 0 2px" }} />
        <div className="absolute" style={{ right: -3, top: 118, width: 3, height: 52, background: "#2A2A2C", borderRadius: "0 2px 2px 0" }} />

        <div className="w-full h-full overflow-hidden relative" style={{ borderRadius: 42, background: "#0A0A0A" }}>
          {/* Dynamic Island */}
          <div className="absolute z-20" style={{ top: 14, left: "50%", transform: "translateX(-50%)", width: 108, height: 30, background: "#000", borderRadius: 20 }} />

          {/* Status bar */}
          <div className="absolute z-10" style={{ top: 0, left: 0, right: 0, height: 52, display: "grid", gridTemplateColumns: "1fr 108px 1fr", alignItems: "center", padding: "0 16px" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>9:41</span>
            </div>
            <div />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg width="13" height="9" viewBox="0 0 13 9">
                <rect x="0" y="4" width="2" height="5" rx="0.8" fill="white" opacity="0.3" />
                <rect x="3.5" y="2.5" width="2" height="6.5" rx="0.8" fill="white" opacity="0.5" />
                <rect x="7" y="1" width="2" height="8" rx="0.8" fill="white" opacity="0.7" />
                <rect x="10.5" y="0" width="2.5" height="9" rx="0.8" fill="white" />
              </svg>
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                <circle cx="6.5" cy="8.8" r="1.1" fill="white" />
                <path d="M3 5.8C4 4.8 5.2 4.2 6.5 4.2C7.8 4.2 9 4.8 10 5.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
                <path d="M0.5 3C2.3 1.2 4.3 0.2 6.5 0.2C8.7 0.2 10.7 1.2 12.5 3" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
              </svg>
              <div style={{ position: "relative", width: 20, height: 10 }}>
                <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.35)", borderRadius: 2.5 }} />
                <div style={{ position: "absolute", left: 1.5, top: 1.5, bottom: 1.5, right: 4, background: "#CBFF03", borderRadius: 1 }} />
                <div style={{ position: "absolute", right: -2.5, top: "50%", transform: "translateY(-50%)", width: 1.5, height: 4.5, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Screens */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {activeScreen === 0 && <ScreenProfile />}
              {activeScreen === 1 && <ScreenSeance />}
              {activeScreen === 2 && <ScreenPaiement />}
              {activeScreen === 3 && <ScreenDashboard />}
            </motion.div>
          </AnimatePresence>

          {/* Screen glare */}
          <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 42, background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 50, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%)" }} />
      </div>
    </div>
  );
}

function ScreenProfile() {
  return (
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 14px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 8, fontFamily: "monospace" }}>
          madger.app/<span style={{ color: "#CBFF03" }}>leonard</span>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #CBFF03, #6da300)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 18, marginBottom: 7 }}>LB</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Léonard Bondeau</div>
        <div style={{ fontSize: 10, color: "#8A8A8A", marginBottom: 4 }}>Coach sportif · Paris 11e</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <svg key={i} width="9" height="9" viewBox="0 0 10 10">
              <path d="M5 1L6.2 3.8H9L6.7 5.6L7.6 8.5L5 6.8L2.4 8.5L3.3 5.6L1 3.8H3.8L5 1Z" fill="#CBFF03" />
            </svg>
          ))}
          <span style={{ fontSize: 9, color: "#8A8A8A", marginLeft: 2 }}>4.9 · 38 avis</span>
        </div>
        <div style={{ fontSize: 9, color: "#8A8A8A", lineHeight: 1.5, maxWidth: 210, marginBottom: 8 }}>
          Spécialisé en remise en forme et prépa physique. Séances en présentiel ou visio.
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
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ fontSize: 10, color: "#8A8A8A" }}>Retour</span>
      </div>
      <div style={{ padding: "11px", borderRadius: 13, background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.2)", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Coaching individuel</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
          {["60 min", "Présentiel", "Paris 11e"].map(t => (
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
        {[["L", "7"], ["M", "8"], ["M", "9"], ["J", "10"], ["V", "11"]].map(([d, n], i) => (
          <div key={i} style={{ padding: "5px 0", borderRadius: 7, textAlign: "center", background: i === 2 ? "#CBFF03" : "transparent", color: i === 2 ? "#000" : "#8A8A8A", border: i === 2 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 8 }}>{d}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{n}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5A5A5A", marginBottom: 6 }}>Créneaux disponibles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
        {["9:00", "10:00", "11:00", "14:00", "15:00", "17:00"].map((h) => (
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Paiement</div>
      <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: "#8A8A8A", marginBottom: 5 }}>Récapitulatif</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Coaching individuel</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03" }}>50 €</div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "5px 0" }} />
        <div style={{ fontSize: 9, color: "#8A8A8A" }}>Mer. 9 mai · 10:00 · Présentiel · Paris 11e</div>
        <div style={{ fontSize: 9, color: "#8A8A8A", marginTop: 1 }}>avec Léonard Bondeau</div>
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
        <div style={{ padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 2 }}>Expiration</div>
          <div style={{ fontSize: 11, color: "#fff" }}>12 / 27</div>
        </div>
        <div style={{ padding: "7px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ fontSize: 9, color: "#5A5A5A", marginBottom: 2 }}>CVC</div>
          <div style={{ fontSize: 11, color: "#fff" }}>•••</div>
        </div>
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
    <div style={{ paddingTop: 52, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: "#8A8A8A" }}>Bonjour,</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Marie</div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>M</div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ padding: "8px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {[["8", "Séances"], ["400 €", "Dépensé"], ["2", "Ce mois"]].map(([v, l]) => (
            <div key={l} style={{ padding: "7px 6px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 7, color: "#8A8A8A", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px", borderRadius: 12, background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5A5A5A" }}>Prochaine séance</div>
            <div style={{ padding: "2px 6px", borderRadius: 20, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 7, color: "#CBFF03", fontWeight: 600, lineHeight: 1 }}>Dans 2 jours</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #CBFF03, #6da300)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#000", fontSize: 9, flexShrink: 0 }}>LB</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Coaching individuel</div>
              <div style={{ fontSize: 9, color: "#8A8A8A" }}>Léonard Bondeau</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {[["Date", "Mer. 9 mai"], ["Heure", "10:00"], ["Lieu", "Paris 11e"]].map(([l, v]) => (
              <div key={l} style={{ padding: "4px 6px", borderRadius: 6, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 7, color: "#5A5A5A" }}>{l}</div>
                <div style={{ fontSize: 8, color: "#fff", fontWeight: 600, marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {[
            {
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
              label: "Message"
            },
            {
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6C4.89 2 4 2.89 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2Z" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
              label: "Facture"
            },
            {
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#8A8A8A" strokeWidth="1.8" /><path d="M16 2V6M8 2V6M3 10H21" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" /></svg>,
              label: "Agenda"
            },
          ].map(({ icon, label }) => (
            <div key={label} style={{ padding: "7px 5px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>{icon}</div>
              <div style={{ fontSize: 8, color: "#8A8A8A" }}>{label}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5A5A5A", marginBottom: 5 }}>Historique</div>
          {[
            { label: "Coaching individuel", date: "Mer. 2 mai", montant: "50 €", status: "Terminée" },
            { label: "Coaching individuel", date: "Mer. 25 avr.", montant: "50 €", status: "Terminée" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 10, color: "#fff", fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 8, color: "#8A8A8A" }}>{s.date} · {s.montant}</div>
              </div>
              <div style={{ padding: "2px 6px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 7, color: "#4ADE80", fontWeight: 600, lineHeight: 1 }}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}