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
      <svg width="46" height="20" viewBox="0 0 56 24" fill="none">
        {/* Apple logo */}
        <path d="M13.6 8.1c-.1-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5-.5 0-1.2-.5-2-.5-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.6.8 6.1.5.7 1.1 1.6 1.9 1.5.8 0 1-.5 1.9-.5.9 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.5.6-.8.8-1.7.8-1.7 0 0-1.5-.6-1.5-2.4zM12 3.5c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8z" fill="#fff"/>
        <text x="18" y="16.5" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif" fontSize="14" fontWeight="500" letterSpacing="-0.3" fill="#fff">Pay</text>
      </svg>
    ),
  },
  {
    name: "Google Pay",
    label: "Paiement rapide",
    logo: (
      <svg width="52" height="20" viewBox="0 0 62 24" fill="none">
        {/* Google G */}
        <path d="M19.6 12.2c0-.6-.05-1.1-.16-1.6H12v3.1h4.3c-.18 1-.74 1.85-1.58 2.42v2.02h2.55c1.5-1.38 2.33-3.42 2.33-5.94z" fill="#4285F4"/>
        <path d="M12 20c2.16 0 3.97-.72 5.3-1.94l-2.55-2.02c-.71.48-1.62.76-2.75.76-2.12 0-3.91-1.43-4.55-3.35H4.8v2.08C6.13 18.18 8.86 20 12 20z" fill="#34A853"/>
        <path d="M7.45 13.45c-.16-.48-.25-1-.25-1.53s.09-1.05.25-1.53V8.31H4.8C4.29 9.34 4 10.5 4 11.92s.29 2.58.8 3.61l2.65-2.08z" fill="#FBBC05"/>
        <path d="M12 6.58c1.2 0 2.27.41 3.11 1.22l2.33-2.33C16.04 4.18 14.23 3.42 12 3.42 8.86 3.42 6.13 5.24 4.8 7.96l2.65 2.08C8.09 8.12 9.88 6.58 12 6.58z" fill="#EA4335"/>
        <text x="22" y="16.5" fontFamily="'Product Sans','Google Sans',-apple-system,sans-serif" fontSize="14" fontWeight="500" letterSpacing="-0.2" fill="#fff">Pay</text>
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
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex flex-nowrap items-center justify-center gap-3 sm:flex-wrap sm:gap-10">
          <span
            className="text-[10px] sm:text-[11px]"
            style={{
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Court sur mobile pour laisser les 3 logos sur la même ligne */}
            <span className="sm:hidden">Sécurisé</span>
            <span className="hidden sm:inline">Sécurisé &amp; certifié</span>
          </span>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} className="hidden sm:block" />

          {INTEGRATIONS.map(({ name, label, logo }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1.5 cursor-default"
              style={{ color: "rgba(255,255,255,0.55)", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"}
            >
              <div style={{ height: 20, display: "flex", alignItems: "center" }}>{logo}</div>
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
