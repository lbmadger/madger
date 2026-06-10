"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import CoachAside from "@/components/ui/CoachAside";

const PAINS = [
  { text: "Je passe plus de temps sur WhatsApp à caler des créneaux qu'à coacher" },
  { text: "Relancer un client pour un paiement, c'est gênant, alors j'attends" },
  { text: "En fin de mois, je rouvre Excel pour refaire les mêmes factures" },
  { text: "Notion, Google Agenda, Stripe, Excel... tout dans des onglets séparés" },
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

// ── Tool logos ─────────────────────────────────────────────────────
const WhatsAppIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="#25D366"/>
    <path d="M20 8C13.4 8 8 13.4 8 20c0 2.4.7 4.6 1.8 6.5L8.2 32l5.7-1.5A11.9 11.9 0 0020 32c6.6 0 12-5.4 12-12S26.6 8 20 8z" fill="white"/>
    <path d="M20 10.5C14.7 10.5 10.5 14.7 10.5 20c0 1.8.5 3.5 1.4 4.9l-.8 3.1 3.2-.8c1.4.7 3 1.2 4.7 1.2 5.3 0 9.5-4.2 9.5-9.5S25.3 10.5 20 10.5z" fill="#25D366"/>
    <path d="M25.8 22.7c-.3-.1-1.6-.8-1.9-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.9-1.5-1.9-1.7-2.2-.2-.3 0-.5.1-.7.1-.2.3-.4.5-.6.1-.2.2-.4.3-.5.1-.2 0-.4-.1-.6-.2-.3-.8-1.9-1.1-2.5-.3-.6-.5-.5-.7-.5h-.6c-.2.1-.5.3-.8.6-.3.3-.9 1.1-.9 2.7 0 1.6 1 3 1.2 3.2.2.3 2 3.3 5 4.5 3 1.2 3 .8 3.5.8.5 0 1.6-.6 1.9-1.3.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3z" fill="white"/>
  </svg>
);

const GoogleCalIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="white"/>
    <rect x="6" y="8" width="28" height="26" rx="2.5" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
    <path d="M6 10.5A2.5 2.5 0 0 1 8.5 8H31.5A2.5 2.5 0 0 1 34 10.5V17H6V10.5Z" fill="#4285F4"/>
    <rect x="13" y="5" width="3" height="7" rx="1.5" fill="#4285F4"/>
    <rect x="24" y="5" width="3" height="7" rx="1.5" fill="#4285F4"/>
    <circle cx="12" cy="22" r="2" fill="#EA4335"/>
    <circle cx="17.5" cy="22" r="2" fill="#FBBC05"/>
    <circle cx="23" cy="22" r="2" fill="#34A853"/>
    <circle cx="28.5" cy="22" r="2" fill="#4285F4"/>
    <circle cx="12" cy="29" r="2" fill="#EA4335" opacity="0.25"/>
    <circle cx="17.5" cy="29" r="2" fill="#FBBC05" opacity="0.25"/>
    <circle cx="23" cy="29" r="2" fill="#34A853" opacity="0.25"/>
    <circle cx="28.5" cy="29" r="2" fill="#4285F4" opacity="0.25"/>
  </svg>
);

const ExcelIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="#185C37"/>
    <rect x="22" y="8" width="12" height="24" rx="1.5" fill="white"/>
    <line x1="22" y1="15" x2="34" y2="15" stroke="#D0D0D0" strokeWidth="0.8"/>
    <line x1="22" y1="21" x2="34" y2="21" stroke="#D0D0D0" strokeWidth="0.8"/>
    <line x1="22" y1="27" x2="34" y2="27" stroke="#D0D0D0" strokeWidth="0.8"/>
    <line x1="28" y1="8" x2="28" y2="32" stroke="#D0D0D0" strokeWidth="0.8"/>
    <rect x="7" y="8" width="17" height="24" rx="1.5" fill="#21A366"/>
    <line x1="10.5" y1="13" x2="20.5" y2="27" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <line x1="20.5" y1="13" x2="10.5" y2="27" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const StripeIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="#635BFF"/>
    <path d="M18.5 16.3c0-.9.8-1.3 2-1.3 1.8 0 4 .5 5.8 1.4v-4.9c-1.7-.6-3.6-1-5.6-1-4.2 0-7 2.2-7 5.9 0 5.7 7.9 4.8 7.9 7.2 0 1.1-.9 1.4-2.2 1.4-1.9 0-4.4-.8-6.4-1.9v5c2.1.9 4.3 1.4 6.4 1.4 4.3 0 7.3-2.1 7.3-5.9-.1-6.2-8-5.1-8.2-7.3z" fill="white"/>
  </svg>
);

const NotionIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="#F7F6F3"/>
    <rect x="9" y="10" width="5" height="20" fill="#1B1B1B"/>
    <rect x="26" y="10" width="5" height="20" fill="#1B1B1B"/>
    <polygon points="14,10 19,10 26,30 21,30" fill="#1B1B1B"/>
  </svg>
);

const CalendlyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="9" fill="#006BFF"/>
    <rect x="9" y="12" width="22" height="19" rx="2.5" fill="white"/>
    <path d="M9 14.5A2.5 2.5 0 0 1 11.5 12H28.5A2.5 2.5 0 0 1 31 14.5V18H9V14.5Z" fill="#006BFF"/>
    <rect x="14" y="8.5" width="3" height="7" rx="1.5" fill="white"/>
    <rect x="23" y="8.5" width="3" height="7" rx="1.5" fill="white"/>
    <circle cx="14.5" cy="24" r="2" fill="#006BFF"/>
    <circle cx="20" cy="24" r="2" fill="#006BFF"/>
    <circle cx="25.5" cy="24" r="2" fill="#006BFF"/>
    <circle cx="14.5" cy="28.5" r="2" fill="#006BFF" opacity="0.3"/>
    <circle cx="20" cy="28.5" r="2" fill="#006BFF" opacity="0.3"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="ig-prob-grad" x1="0" y1="40" x2="40" y2="0">
        <stop offset="0%" stopColor="#F9CE34"/>
        <stop offset="35%" stopColor="#EE2A7B"/>
        <stop offset="100%" stopColor="#6228D7"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="9" fill="url(#ig-prob-grad)"/>
    <rect x="10" y="10" width="20" height="20" rx="5.5" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="20" cy="20" r="5" stroke="white" strokeWidth="2" fill="none"/>
    <circle cx="26.5" cy="13.5" r="1.5" fill="white"/>
  </svg>
);

const TOOLS = [
  { name: "WhatsApp", icon: <WhatsAppIcon /> },
  { name: "Google Agenda", icon: <GoogleCalIcon /> },
  { name: "Excel", icon: <ExcelIcon /> },
  { name: "Stripe", icon: <StripeIcon /> },
  { name: "Notion", icon: <NotionIcon /> },
  { name: "Calendly", icon: <CalendlyIcon /> },
  { name: "Instagram DM", icon: <InstagramIcon /> },
];

export default function Problem() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, 5, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <CoachAside line="Ça te parle, non ? 😅" src="/character/coach-point.png" side="right" inset={12} />
      <div className="max-w-6xl mx-auto px-5 sm:px-6">

        {/* Stat centrale */}
        <motion.div
          className="text-center mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <SectionLabel>Le problème</SectionLabel>

          <motion.div
            ref={ref}
            className="text-shimmer font-extrabold leading-none mb-4"
            style={{ fontSize: "clamp(96px, 18vw, 200px)", letterSpacing: "-0.05em" }}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            +{count}h
          </motion.div>

          <div
            className="font-bold text-white mb-4"
            style={{ fontSize: "clamp(18px, 2.5vw, 28px)", letterSpacing: "-0.02em" }}
          >
            perdues en tâches administratives, en moyenne chaque semaine
          </div>
          <p className="text-text-muted max-w-xl mx-auto" style={{ fontSize: 16, lineHeight: 1.65 }}>
            C'est ce que nous disent les coachs qu'on a rencontrés.
            Vous êtes coach, pas secrétaire.
          </p>
        </motion.div>

        {/* ── Outils chaos ───────────────────────────────────── */}
        <motion.div
          className="mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Header */}
          <p
            className="text-center font-semibold mb-8"
            style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}
          >
            Tu jongle entre tout ça en ce moment
          </p>

          {/* Logos grid */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8">
            {TOOLS.map((tool, i) => (
              <motion.div
                key={tool.name}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
              >
                <div
                  style={{
                    filter: "grayscale(0.2)",
                    opacity: 0.75,
                    transition: "opacity 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.75";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  {tool.icon}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>
                  {tool.name}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Arrow + Madger */}
          <motion.div
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div style={{ height: 1, width: 48, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>
              remplacé par
            </span>
            <div style={{ height: 1, width: 48, background: "rgba(255,255,255,0.1)" }} />
          </motion.div>

          <motion.div
            className="flex justify-center mt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: "rgba(203,255,3,0.07)",
                border: "1.5px solid rgba(203,255,3,0.3)",
              }}
            >
              {/* Madger icon */}
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#0A0A0A"/>
                <path d="M4 26 L9.5 10 L15 18.5 L20.5 9 L23.5 19C25 18.5 26.5 12 27.5 5.5" fill="none" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="27.5" cy="5.5" r="1.3" fill="#CBFF03"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#CBFF03", letterSpacing: "-0.02em" }}>
                Madger · 1 seul lien
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Pain quotes ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {PAINS.map((p, i) => (
            <motion.div
              key={i}
              className="spotlight-card flex items-start gap-3 px-5 py-4 rounded-2xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              onMouseMove={handleSpotlight}
            >
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.15)", fontFamily: "Georgia, serif", lineHeight: 1, marginTop: 2, flexShrink: 0 }}>"</span>
              <span className="relative text-text-muted text-sm leading-relaxed italic" style={{ zIndex: 2 }}>
                {p.text}
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
