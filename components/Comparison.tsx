"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import CoachAside from "@/components/ui/CoachAside";

const features = [
  { label: "Prise de rendez-vous en ligne",         madger: true,  calendly: true,  whatsapp: false, excel: false },
  { label: "Paiement intégré à la réservation",     madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Facturation automatique conforme",       madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Facturation au format Factur-X",          madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Conservation des données et factures",    madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Rappels automatiques clients",           madger: true,  calendly: true,  whatsapp: false, excel: false },
  { label: "Gestion annulations & remboursements",  madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Dashboard revenus & statistiques",       madger: true,  calendly: false, whatsapp: false, excel: false },
  { label: "Messagerie intégrée",                    madger: true,  calendly: false, whatsapp: true,  excel: false },
];

const cols = [
  { key: "madger",   label: "Madger",   highlight: true  },
  { key: "calendly", label: "Calendly", highlight: false },
  { key: "whatsapp", label: "WhatsApp", highlight: false },
  { key: "excel",    label: "Excel",    highlight: false },
] as const;

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <div
      className="flex items-center justify-center mx-auto"
      style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.25)" }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 4.5l-7 7-3-3" stroke="#CBFF03" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ) : (
    <div
      className="flex items-center justify-center mx-auto"
      style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
        <path d="M3 3l10 10M13 3L3 13" stroke="#3A3A3A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Comparison() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(203,255,3,0.03), transparent 70%)" }}
      />
      <CoachAside line="Le choix est vite fait, non ? 👍" src="/character/coach-ok.png" side="left" inset={12} />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-12"
        >
          <SectionLabel>Comparatif</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(26px, 4vw, 44px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Pourquoi Madger et pas<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>les autres outils ?</span>
          </h2>
          <p className="text-text-muted text-base max-w-md mx-auto" style={{ lineHeight: 1.6 }}>
            Calendly gère vos RDV. Madger gère votre activité : réservation, paiement et facture conforme.
          </p>
        </motion.div>

        {/* Mobile : liste simple Madger */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="md:hidden"
          style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(203,255,3,0.15)", background: "#141414" }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(203,255,3,0.1)", background: "rgba(203,255,3,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#CBFF03" }}>Madger fait tout ça</span>
            <span style={{ fontSize: 11, color: "#5A5A5A" }}>vs Calendly, WhatsApp, Excel</span>
          </div>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderBottom: i < features.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <span style={{ fontSize: 13, color: "#C0C0C0" }}>{f.label}</span>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 4.5l-7 7-3-3" stroke="#CBFF03" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
          <div style={{ padding: "14px 18px" }}>
            <a href="#early-access" className="block w-full text-center py-3 rounded-xl text-black font-bold text-sm" style={{ background: "#CBFF03" }}>
              Commencer gratuitement
            </a>
          </div>
        </motion.div>

        {/* Desktop : tableau complet */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="hidden md:block"
          style={{ overflowX: "auto" }}
        >
          <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", minWidth: 640 }}>
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                background: "#141414",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                padding: "0 20px",
              }}
            >
              <div className="py-4" />
              {cols.map(({ key, label, highlight }) => (
                <div
                  key={key}
                  className="py-4 text-center"
                  style={{
                    position: "relative",
                    background: highlight ? "rgba(203,255,3,0.04)" : "transparent",
                    borderLeft: highlight ? "1px solid rgba(203,255,3,0.12)" : "1px solid rgba(255,255,255,0.04)",
                    borderRight: highlight ? "1px solid rgba(203,255,3,0.12)" : "none",
                  }}
                >
                  {highlight && (
                    <div
                      style={{
                        position: "absolute",
                        top: -1, left: -1, right: -1,
                        height: 2,
                        background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: highlight ? "#CBFF03" : "#8A8A8A", letterSpacing: "-0.01em" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.012)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  padding: "0 20px",
                  alignItems: "center",
                }}
              >
                <div className="py-3.5" style={{ fontSize: 13, color: "#C0C0C0", lineHeight: 1.4, paddingRight: 12 }}>
                  {f.label}
                </div>
                {cols.map(({ key, highlight }) => (
                  <div
                    key={key}
                    className="py-3.5"
                    style={{
                      background: highlight ? "rgba(203,255,3,0.04)" : "transparent",
                      borderLeft: highlight ? "1px solid rgba(203,255,3,0.12)" : "1px solid rgba(255,255,255,0.04)",
                      borderRight: highlight ? "1px solid rgba(203,255,3,0.12)" : "none",
                    }}
                  >
                    <Check ok={f[key]} />
                  </div>
                ))}
              </motion.div>
            ))}

            {/* CTA row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                background: "#141414",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "16px 20px",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#5A5A5A" }}>
                ✓ Gratuit pour commencer · 0 % commission en Pro
              </div>
              {cols.map(({ key, label, highlight }) => (
                <div
                  key={key}
                  className="px-3 py-4 text-center"
                  style={{
                    background: highlight ? "rgba(203,255,3,0.04)" : "transparent",
                    borderLeft: highlight ? "1px solid rgba(203,255,3,0.12)" : "1px solid rgba(255,255,255,0.04)",
                    borderRight: highlight ? "1px solid rgba(203,255,3,0.12)" : "none",
                    borderBottom: highlight ? "1px solid rgba(203,255,3,0.12)" : "none",
                    borderRadius: highlight ? "0 0 8px 8px" : undefined,
                  }}
                >
                  {highlight ? (
                    <a
                      href="#early-access"
                      className="block w-full py-2 rounded-xl text-black font-bold text-xs"
                      style={{ background: "#CBFF03" }}
                    >
                      Commencer
                    </a>
                  ) : (
                    <span style={{ fontSize: 10, color: "#3A3A3A" }}>{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bande vide : Léo se tient dans le noir sous le tableau, sans le chevaucher */}
        <div aria-hidden className="h-40 sm:h-52" />
      </div>
    </section>
  );
}
