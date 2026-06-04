"use client";

import { motion } from "framer-motion";

const INTEGRATIONS = [
  {
    name: "Stripe",
    label: "Paiements",
    logo: (
      <svg width="48" height="20" viewBox="0 0 48 20" fill="currentColor">
        <text x="0" y="15" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="16" fontWeight="700" letterSpacing="-0.5" fill="currentColor">Stripe</text>
      </svg>
    ),
  },
  {
    name: "Apple Pay",
    label: "Paiement rapide",
    logo: (
      <svg width="40" height="20" viewBox="0 0 40 17" fill="currentColor">
        <path d="M7.3 3.4c-.5.6-1.4 1.1-2.2 1.1-.1-.9.3-1.8.8-2.3.5-.6 1.4-1.1 2.2-1.1.1.9-.2 1.8-.8 2.3zm.8 1.2c-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.6-1.2 0-2.4.7-3 1.9-1.3 2.2-.3 5.5.9 7.3.6.9 1.4 1.9 2.3 1.9.9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.5 1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2.1 0 0-1.9-.8-1.9-2.9 0-1.8 1.4-2.6 1.5-2.7-.6-1-1.6-1.5-2.4-1.6zm7.1-1.2V16.2h1.9V12h2.6c2.3 0 4-1.6 4-3.9 0-2.3-1.6-3.9-3.8-3.9h-4.7zm1.9 1.6h2.1c1.6 0 2.5.9 2.5 2.3 0 1.5-.9 2.3-2.6 2.3H17.1V5zm8.9 10.5c1.2 0 2.2-.6 2.7-1.5h.1v1.4h1.7V8.8c0-1.7-1.4-2.9-3.5-2.9-1.9 0-3.4 1.2-3.5 2.8h1.7c.1-.8.8-1.3 1.7-1.3 1.1 0 1.7.5 1.7 1.5v.6l-2.3.1c-2.1.1-3.2 1-3.2 2.5 0 1.6 1.2 2.5 2.9 2.5zm.5-1.5c-.9 0-1.5-.4-1.5-1.1 0-.8.6-1.2 1.8-1.2l2-.2v.6c0 1.1-1 2-2.3 2zm12.5-6.9h-2L35.4 13h-.1L32.8 7.1H30.7l3.5 9.8-.2.5c-.3.9-.8 1.3-1.6 1.3-.2 0-.5 0-.6-.1v1.5c.2.1.6.1.8.1 1.9 0 2.7-.7 3.5-2.8l3.4-10.3z"/>
      </svg>
    ),
  },
  {
    name: "Google Pay",
    label: "Paiement rapide",
    logo: (
      <svg width="50" height="20" viewBox="0 0 50 17" fill="none">
        <path d="M20.3 8.6c0-.5-.1-.9-.2-1.4H13v2.6h4.1c-.2 1-.7 1.8-1.5 2.4v2h2.3c1.4-1.3 2.3-3.2 2.4-5.1v-.5z" fill="#4285F4"/>
        <path d="M13 17c2.2 0 4-.7 5.3-2l-2.3-2c-.7.5-1.6.8-3 .8-2.2 0-4-1.5-4.7-3.5H5.9v2.1C7.2 15.3 9.9 17 13 17z" fill="#34A853"/>
        <path d="M8.3 10.3c-.2-.5-.2-1-.2-1.5s.1-1.1.2-1.5V5.2H5.9C5.3 6.3 5 7.6 5 9s.3 2.7.9 3.8l2.4-2.5z" fill="#FBBC05"/>
        <path d="M13 5.3c1.2 0 2.3.4 3.1 1.3l2.4-2.4C17 2.7 15.2 2 13 2 9.9 2 7.2 3.7 5.9 6.2l2.4 2.1c.7-2 2.5-3 4.7-3z" fill="#EA4335"/>
        <text x="23" y="13" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="600" fill="currentColor">Pay</text>
      </svg>
    ),
  },
  {
    name: "PCI-DSS",
    label: "Sécurité",
    logo: (
      <svg width="52" height="20" viewBox="0 0 52 17" fill="none">
        <path d="M4 2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M9 5v7M6 7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        <text x="21" y="13" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="700" fill="currentColor">PCI-DSS</text>
      </svg>
    ),
  },
  {
    name: "RGPD",
    label: "Données UE",
    logo: (
      <svg width="44" height="20" viewBox="0 0 44 17" fill="none">
        <path d="M9 1C4.6 1 1 4.6 1 9s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M9 3v12M4 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
        <text x="21" y="13" fontFamily="system-ui,sans-serif" fontSize="11" fontWeight="700" fill="currentColor">RGPD</text>
      </svg>
    ),
  },
];

export default function TrustBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
      className="py-8 sm:py-10"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.22)",
            whiteSpace: "nowrap",
          }}>
            Sécurisé &amp; certifié
          </span>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} className="hidden sm:block" />

          {INTEGRATIONS.map(({ name, label, logo }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1.5 cursor-default"
              style={{ color: "rgba(255,255,255,0.32)", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.32)"}
            >
              <div style={{ height: 20, display: "flex", alignItems: "center" }}>{logo}</div>
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
