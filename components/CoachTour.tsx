"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

/**
 * CoachTour — visite guidée animée par la mascotte.
 *
 * Le coach présente les fonctionnalités une par une : il bouge (se penche,
 * pointe, zoome), une bulle change de réplique, et un aperçu d'UI s'affiche
 * pour chaque fonctionnalité. Auto-défilement + navigation manuelle.
 *
 * Multi-poses : si des images de poses sont présentes (voir POSE_SRC), le
 * personnage change carrément d'image selon l'étape ; sinon il anime l'image
 * de base. Mobile + desktop.
 */

const BASE_SRC = "/character/coach-cutout.png";

// Poses dédiées par étape (détourées + normalisées). null = pose de base.
const POSE_SRC: (string | null)[] = [
  null,                          // 0 — page coach : pose neutre
  "/character/coach-point.png",  // 1 — réservation : il pointe
  "/character/coach-ok.png",     // 2 — paiement : pouce levé
  "/character/coach-point.png",  // 3 — factures : il pointe
  "/character/coach-ok.png",     // 4 — tableau de bord : pouce levé
];

interface Step {
  icon: string;
  title: string;
  line: string; // réplique du coach (bulle)
  desc: string;
  mock: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: "🔗",
    title: "Ta page coach",
    line: "Ça, c'est ta vitrine 👇",
    desc: "Un seul lien — madger.app/tonnom — avec ton profil, tes offres et tes avis. Tu le mets dans ta bio, c'est tout.",
    mock: <ProfileMock />,
  },
  {
    icon: "📅",
    title: "Réservation en ligne",
    line: "Ici, tes clients réservent seuls.",
    desc: "Ils voient tes disponibilités et bloquent un créneau en quelques secondes. Fini les allers-retours par message.",
    mock: <CalendarMock />,
  },
  {
    icon: "💳",
    title: "Paiement à la réservation",
    line: "Et là, ils paient direct 💸",
    desc: "Stripe encaisse au moment de la réservation. Zéro impayé, zéro relance à courir.",
    mock: <PayMock />,
  },
  {
    icon: "🧾",
    title: "Factures automatiques",
    line: "La facture ? Je m'en occupe.",
    desc: "Chaque séance génère sa facture conforme et l'envoie toute seule à ton client. Plus de fin de mois galère.",
    mock: <InvoiceMock />,
  },
  {
    icon: "📊",
    title: "Ton tableau de bord",
    line: "Toi, tu pilotes tout d'ici.",
    desc: "Revenus, agenda, clients, séances à venir : tu vois toute ton activité en un coup d'œil.",
    mock: <DashMock />,
  },
];

export default function CoachTour() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [poseOk, setPoseOk] = useState<boolean[]>(POSE_SRC.map(() => true));

  const sectionRef = useRef<HTMLElement>(null);

  // Suivi du curseur : le coach s'incline vers la souris (il "te regarde")
  const px = useMotionValue(0); // -1 .. 1
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [-7, 7]);
  const rotateX = useTransform(sy, [-1, 1], [5, -5]);
  const shiftX = useTransform(sx, [-1, 1], [-18, 18]);

  const handleMove = (e: React.MouseEvent) => {
    const el = sectionRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    px.set(Math.max(-1, Math.min(1, nx)));
    py.set(Math.max(-1, Math.min(1, ny)));
  };
  const handleLeave = () => {
    px.set(0);
    py.set(0);
  };

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((v) => (v + 1) % STEPS.length), 5200);
    return () => clearTimeout(t);
  }, [i, paused]);

  const go = (n: number) => {
    setI((n + STEPS.length) % STEPS.length);
    setPaused(true);
    setTimeout(() => setPaused(false), 9000);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  };

  const step = STEPS[i];
  const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
  const dir = side === "left" ? -1 : 1;
  // Pas de rotation : juste un léger déplacement vers le côté de la bulle.
  const pose = { x: dir * 8 };
  const wantPose = POSE_SRC[i];
  const useDedicatedPose = !!wantPose && poseOk[i];
  const imgSrc = useDedicatedPose ? (wantPose as string) : BASE_SRC;

  return (
    <section
      id="coach"
      ref={sectionRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ perspective: 1000 }}
    >
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        {/* En-tête */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3">
            <SectionLabel>Visite guidée</SectionLabel>
          </div>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(26px, 4.5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
          >
            Laisse le coach te montrer<br className="hidden sm:block" /> tout ce que Madger fait.
          </h2>
        </div>

        {/* Corps : coach + panneau */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">

          {/* ── COACH ── */}
          <div className="relative flex flex-col items-center order-1">
            {/* Bulle */}
            <div
              className="relative w-full mb-1"
              style={{ minHeight: 82 }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: dir * 40, y: 4 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: dir * -28 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-[300px] rounded-2xl px-4 py-3"
                  style={{
                    position: "absolute",
                    top: 0,
                    [side === "left" ? "left" : "right"]: 0,
                    background: "linear-gradient(180deg, #181818, #121212)",
                    border: "1px solid rgba(203,255,3,0.30)",
                    boxShadow: "0 12px 34px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        fontSize: 18,
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(203,255,3,0.14)",
                        border: "1px solid rgba(203,255,3,0.3)",
                      }}
                    >
                      {step.icon}
                    </span>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#CBFF03" }}>
                        Coach Madger
                      </span>
                      <p style={{ fontSize: 15, lineHeight: 1.35, color: "#fff", marginTop: 1, fontWeight: 600 }}>
                        {step.line}
                      </p>
                    </div>
                  </div>
                  <span
                    className="absolute"
                    style={{
                      bottom: -7, [side === "left" ? "right" : "left"]: 34, transform: "rotate(45deg)",
                      width: 14, height: 14, background: "#121212",
                      borderRight: "1px solid rgba(203,255,3,0.30)", borderBottom: "1px solid rgba(203,255,3,0.30)",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Personnage : pose (par étape) + flottement (idle) */}
            <motion.button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="Étape suivante"
              className="relative block"
              style={{ width: "min(64vw, 300px)" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scaleX: 1.06, scaleY: 0.9 }}
            >
              {/* Inclinaison vers le curseur — il "te regarde" (desktop) */}
              <motion.div style={{ rotateX, rotateY, x: shiftX, transformPerspective: 800 }}>
                {/* Léger déplacement selon l'étape (pas de rotation) */}
                <motion.div
                  animate={{ x: pose.x }}
                  transition={{ type: "spring", stiffness: 130, damping: 16 }}
                >
                  {/* Flottement vertical doux */}
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-full"
                    style={{ aspectRatio: "1200 / 1500" }}
                  >
                    {/* Lueur verte */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse 40% 50% at 50% 50%, rgba(203,255,3,0.18), transparent 66%)",
                        filter: "blur(10px)",
                      }}
                    />
                    {/* Flash vert à chaque changement de pose */}
                    <AnimatePresence>
                      <motion.div
                        key={"burst" + i}
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0.55, scale: 0.5 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{
                          background:
                            "radial-gradient(circle at 50% 52%, rgba(203,255,3,0.45), transparent 60%)",
                        }}
                      />
                    </AnimatePresence>
                    {/* La pose "saute" dans sa nouvelle posture (rebond) */}
                    <AnimatePresence>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <motion.img
                        key={imgSrc}
                        src={imgSrc}
                        alt=""
                        draggable={false}
                        onError={() =>
                          setPoseOk((prev) => {
                            const n = [...prev];
                            n[i] = false;
                            return n;
                          })
                        }
                        initial={{ opacity: 0, scale: 0.88, y: "4%", rotate: dir * -3 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{
                          opacity: { duration: 0.18 },
                          default: { type: "spring", stiffness: 320, damping: 18 },
                        }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "bottom",
                          transformOrigin: "50% 100%",
                          display: "block",
                          filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.5))",
                        }}
                      />
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.button>

            {/* Indice d'interaction */}
            <motion.div
              className="flex items-center gap-1.5 mt-3"
              style={{ fontSize: 12, color: "#CBFF03", fontWeight: 600 }}
              animate={{ opacity: [0.45, 1, 0.45], y: [0, -2, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span>👆 Tape sur le coach pour la suite</span>
            </motion.div>
          </div>

          {/* ── PANNEAU FONCTIONNALITÉ ── */}
          <div className="relative order-2">
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ background: "linear-gradient(180deg, #131313, #0F0F0F)", border: "1px solid rgba(255,255,255,0.10)", minHeight: 380 }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={i}
                  className="absolute inset-0 p-5 sm:p-7"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      style={{ fontSize: 22, width: 44, height: 44, borderRadius: 12, background: "rgba(203,255,3,0.10)", border: "1px solid rgba(203,255,3,0.22)" }}
                      className="flex items-center justify-center flex-shrink-0"
                    >
                      {step.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#CBFF03", letterSpacing: "0.1em" }}>
                        {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{step.title}</h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 14.5, color: "#9A9A9A", lineHeight: 1.6, marginBottom: 18 }}>{step.desc}</p>

                  {/* Aperçu d'UI */}
                  <div className="rounded-2xl p-4" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {step.mock}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Étape ${idx + 1}`}
                    onClick={() => go(idx)}
                    style={{
                      height: 6, borderRadius: 999,
                      background: idx === i ? "#CBFF03" : "rgba(255,255,255,0.16)",
                      width: idx === i ? 22 : 6, transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(i - 1)}
                  aria-label="Précédent"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => go(i + 1)}
                  aria-label="Suivant"
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ background: "#CBFF03", color: "#000" }}
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-5 text-center lg:text-left">
              <a
                href="#early-access"
                className="inline-flex font-bold text-sm px-7 py-3.5 rounded-full"
                style={{ background: "#CBFF03", color: "#000" }}
              >
                Je veux ça pour mon activité →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Aperçus d'UI (mini-mockups) ───────────────────────── */

function Row({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-2"
      style={{
        background: accent ? "rgba(203,255,3,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(203,255,3,0.25)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {children}
    </div>
  );
}

function ProfileMock() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#2a2a2a,#1a1a1a)", border: "2px solid rgba(203,255,3,0.4)" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Marie Laurent</div>
          <div style={{ fontSize: 10, color: "#8A8A8A", fontFamily: "monospace" }}>madger.app/<span style={{ color: "#CBFF03" }}>marie</span></div>
        </div>
      </div>
      <Row accent><span style={{ fontSize: 12, color: "#fff" }}>Coaching individuel · 60 min</span><span style={{ fontSize: 12, fontWeight: 700, color: "#CBFF03" }}>50 €</span></Row>
      <Row><span style={{ fontSize: 12, color: "#cfcfcf" }}>Découverte · 45 min</span><span style={{ fontSize: 12, color: "#8A8A8A" }}>Gratuit</span></Row>
    </div>
  );
}

function CalendarMock() {
  const days = [["L","7"],["M","8"],["M","9"],["J","10"],["V","11"]];
  const slots = ["9:00","10:00","11:00","14:00","17:00","18:00"];
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {days.map(([d,n],idx)=>(
          <div key={idx} className="text-center py-1.5 rounded-md" style={{ background: idx===2?"#CBFF03":"rgba(255,255,255,0.03)", color: idx===2?"#000":"#8A8A8A", border: idx===2?"none":"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 9 }}>{d}</div><div style={{ fontSize: 12, fontWeight: 700 }}>{n}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {slots.map((h)=>(
          <div key={h} className="text-center py-2 rounded-md" style={{ fontSize: 11, background: h==="10:00"?"#CBFF03":"rgba(255,255,255,0.03)", color: h==="10:00"?"#000":"#8A8A8A", fontWeight: h==="10:00"?700:400, border: h==="10:00"?"none":"1px solid rgba(255,255,255,0.06)" }}>{h}</div>
        ))}
      </div>
    </div>
  );
}

function PayMock() {
  return (
    <div>
      <Row><span style={{ fontSize: 12, color: "#fff" }}>Coaching individuel</span><span style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03" }}>50 €</span></Row>
      <div className="px-3 py-2.5 rounded-lg mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ fontSize: 10, color: "#5A5A5A", marginBottom: 2 }}>Carte</div>
        <div style={{ fontSize: 13, color: "#fff", letterSpacing: "0.12em" }}>•••• •••• •••• 4242</div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(203,255,3,0.06)", border: "1px solid rgba(203,255,3,0.2)" }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(203,255,3,0.18)", color: "#CBFF03", fontSize: 11 }} className="flex items-center justify-center">✓</span>
        <span style={{ fontSize: 12, color: "#CBFF03", fontWeight: 600 }}>Encaissé à la réservation</span>
      </div>
    </div>
  );
}

function InvoiceMock() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Facture #2024-087</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#CBFF03", background: "rgba(203,255,3,0.1)", padding: "3px 8px", borderRadius: 20 }}>Envoyée auto</span>
      </div>
      <Row><span style={{ fontSize: 12, color: "#cfcfcf" }}>Coaching individuel</span><span style={{ fontSize: 12, color: "#fff" }}>50,00 €</span></Row>
      <Row><span style={{ fontSize: 12, color: "#cfcfcf" }}>TVA</span><span style={{ fontSize: 12, color: "#8A8A8A" }}>—</span></Row>
      <div className="flex items-center justify-between px-3 pt-2">
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Total</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#CBFF03" }}>50,00 €</span>
      </div>
    </div>
  );
}

function DashMock() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="px-3 py-2.5 rounded-lg" style={{ background: "rgba(203,255,3,0.06)", border: "1px solid rgba(203,255,3,0.2)" }}>
          <div style={{ fontSize: 10, color: "#8A8A8A" }}>Revenus du mois</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#CBFF03" }}>2 480 €</div>
        </div>
        <div className="px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, color: "#8A8A8A" }}>Séances</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>38</div>
        </div>
      </div>
      <Row><span style={{ fontSize: 12, color: "#fff" }}>Aujourd'hui · 3 séances</span><span style={{ fontSize: 11, color: "#CBFF03" }}>Voir</span></Row>
      <Row><span style={{ fontSize: 12, color: "#cfcfcf" }}>Clients actifs</span><span style={{ fontSize: 12, color: "#fff" }}>27</span></Row>
    </div>
  );
}
