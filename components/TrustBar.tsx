"use client";

import { motion } from "framer-motion";

const ITEMS = [
  {
    label: "Paiements",
    name: "Stripe",
    logo: (
      <svg height="20" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M27.3 10.2c0-1.1.9-1.5 2.4-1.5 2.1 0 4.8.6 6.9 1.7V5.1C34.4 4.1 32.2 3.7 30 3.7c-5 0-8.3 2.6-8.3 7 0 6.8 9.4 5.7 9.4 8.6 0 1.3-1.1 1.7-2.7 1.7-2.3 0-5.3-.9-7.7-2.2v5.4c2.6 1.1 5.3 1.6 7.7 1.6 5.2 0 8.7-2.5 8.7-7-.1-7.3-9.5-6-9.8-8.6zM0 4.1l.3 1.4C1.5 6.1 3 6.9 4.5 7.3L7.8 25h6l4.6-14.3L23 25h6L34.1 4.1H28l-3.2 13.3L21.4 4.1h-5.5l-3.2 13.4L9.5 4.1H0zm54.6 0h-5.9L45 25h5.9l.9-3h7.3l.9 3H66l-5.7-20.9h-5.7zm-1.5 13.1l2.4-8.9 2.4 8.9h-4.8z" fill="#5A5A5A"/>
      </svg>
    ),
  },
  {
    label: "Hébergement",
    name: "AWS Europe",
    logo: (
      <svg height="20" viewBox="0 0 80 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="18" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#5A5A5A">AWS</text>
        <text x="36" y="18" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#3A3A3A">Europe</text>
      </svg>
    ),
  },
  {
    label: "Facturation",
    name: "Factur-X",
    logo: (
      <svg height="20" viewBox="0 0 90 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="18" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#5A5A5A">Factur-X</text>
      </svg>
    ),
  },
  {
    label: "Sécurité",
    name: "PCI-DSS",
    logo: (
      <svg height="20" viewBox="0 0 80 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="18" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#5A5A5A">PCI-DSS</text>
      </svg>
    ),
  },
  {
    label: "Conformité",
    name: "RGPD",
    logo: (
      <svg height="20" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="18" fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#5A5A5A">RGPD</text>
      </svg>
    ),
  },
];

export default function TrustBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="py-10"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#3A3A3A" }}>
            Construit avec
          </span>
          {ITEMS.map(({ label, name, logo }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity duration-200">
              <div style={{ height: 20, display: "flex", alignItems: "center" }}>{logo}</div>
              <span style={{ fontSize: 9, color: "#3A3A3A", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
