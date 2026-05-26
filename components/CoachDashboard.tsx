"use client";

import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import MadgerLogo from "@/components/ui/MadgerLogo";

/* ── CountUp hook ─────────────────────────────────────────── */
function useCountUp(target: number, duration = 1.4, inView = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, duration]);
  return value;
}

/* ── Mini bar chart ─────────────────────────────────────── */
const barData = [38, 52, 45, 70, 60, 88, 95];
const barDays = ["L", "M", "M", "J", "V", "S", "D"];

function RevenueChart() {
  const max = Math.max(...barData);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 52, paddingTop: 4 }}>
      {barData.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: "100%",
              height: `${(v / max) * 44}px`,
              borderRadius: "3px 3px 0 0",
              background: i === 6
                ? "linear-gradient(180deg, #CBFF03, #9DCC00)"
                : i === 5
                ? "rgba(203,255,3,0.45)"
                : "rgba(203,255,3,0.15)",
            }}
          />
          <span style={{ fontSize: 7, color: "#5A5A5A" }}>{barDays[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Avatar placeholder ─────────────────────────────────── */
function Avatar({ src, size = 28 }: { src: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

const clients = [
  { name: "Julien Martin", tag: "Suivi mensuel", next: "Mer. 9 mai", paid: "160 €", active: true,  photo: "photo-1507003211169-0a1dd7228f2d" },
  { name: "Sophie Blanc",  tag: "Coaching ind.", next: "Jeu. 10 mai", paid: "50 €",  active: true,  photo: "photo-1438761681033-6461ffad8d80" },
  { name: "Romain Duval",  tag: "Prépa physique",next: "Sam. 11 mai", paid: "80 €",  active: false, photo: "photo-1472099645785-5658abf4ff4e" },
  { name: "Clara Morin",   tag: "Coaching ind.", next: "Lun. 13 mai", paid: "50 €",  active: true,  photo: "photo-1544005313-94ddf0286df2" },
];

const bookings = [
  { time: "09:00", name: "Julien Martin",  type: "Suivi mensuel",    duration: "60 min", paid: true,  photo: "photo-1507003211169-0a1dd7228f2d" },
  { time: "10:30", name: "Sophie Blanc",   type: "Coaching ind.",    duration: "60 min", paid: true,  photo: "photo-1438761681033-6461ffad8d80" },
  { time: "12:00", name: "Romain Duval",   type: "Prépa physique",   duration: "90 min", paid: true,  photo: "photo-1472099645785-5658abf4ff4e" },
  { time: "14:00", name: "Lucas Bernard",  type: "Coaching ind.",    duration: "60 min", paid: true,  photo: "photo-1500648767791-00dcc994a43e" },
  { time: "15:30", name: "Clara Morin",    type: "Coaching ind.",    duration: "60 min", paid: true,  photo: "photo-1544005313-94ddf0286df2" },
  { time: "17:00", name: "Emma Petit",     type: "Séance découverte","duration":"45 min", paid: true, photo: "photo-1534528741775-53994a69daeb" },
];

/* ── Animated stat card ──────────────────────────────────── */
function StatCard({ label, value, delta, icon, inView }: { label: string; value: string; delta: string; icon: string; inView: boolean }) {
  // Parse numeric value for animation
  const numMatch = value.replace(/\s/g, "").match(/[\d]+/);
  const numTarget = numMatch ? parseInt(numMatch[0]) : 0;
  const hasPercent = value.includes("%");
  const hasEuro = value.includes("€");
  const prefix = hasEuro ? "" : "";
  const suffix = hasPercent ? " %" : hasEuro ? " €" : "";
  const count = useCountUp(numTarget, 1.4, inView);
  const displayValue = hasEuro
    ? count >= 1000 ? `${Math.floor(count / 1000)} ${String(count % 1000).padStart(3, "0")} €` : `${count} €`
    : `${count}${suffix}`;

  return (
    <div style={{ padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: "#5A5A5A", fontWeight: 500 }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d={icon} stroke="#5A5A5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {inView ? displayValue : value}
      </div>
      <div style={{ fontSize: 9, color: "#4ADE80", marginTop: 4, fontWeight: 600 }}>↑ {delta} vs mois dernier</div>
    </div>
  );
}

export default function CoachDashboard() {
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(203,255,3,0.04), transparent 70%)" }}
      />

      <div id="dashboard" className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 flex flex-col items-center"
        >
          <SectionLabel>Dashboard coach</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Toute votre activité,<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>en un seul endroit.</span>
          </h2>
          <p className="text-text-muted text-lg max-w-lg mx-auto" style={{ lineHeight: 1.6 }}>
            Réservations, paiements, clients, factures : tout est centralisé et automatisé.
          </p>
        </motion.div>

        {/* Mobile : stats + features simplifiées */}
        <div className="md:hidden mb-8">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Revenus ce mois", value: "1 240 €", delta: "+18 %", color: "#CBFF03" },
              { label: "Séances ce mois", value: "24",      delta: "+4",    color: "#CBFF03" },
              { label: "Clients actifs",  value: "12",      delta: "+2",    color: "#4ADE80" },
              { label: "Taux remplissage",value: "87 %",    delta: "+5 %",color: "#4ADE80" },
            ].map(({ label, value, delta, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-4 rounded-2xl"
                style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="text-xs mb-2" style={{ color: "#5A5A5A" }}>{label}</div>
                <div className="font-extrabold text-white text-2xl" style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
                <div className="text-xs mt-1 font-semibold" style={{ color }}>↑ {delta}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[
              { icon: "✓", text: "Réservations & paiements en temps réel" },
              { icon: "✓", text: "Factures générées automatiquement" },
              { icon: "✓", text: "Rappels clients automatiques" },
              { icon: "✓", text: "Messagerie intégrée" },
              { icon: "✓", text: "Synchro Google Calendar" },
              { icon: "✓", text: "0 % de commission en Pro" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#CBFF03", fontWeight: 700, fontSize: 14 }}>{icon}</span>
                <span className="text-sm" style={{ color: "#C0C0C0" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop : browser mockup complet */}
        <div className="hidden md:block" style={{ overflowX: "auto", marginLeft: "-1.5rem", marginRight: "-1.5rem", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(203,255,3,0.06)",
            minWidth: 760,
          }}
        >
          {/* Browser chrome */}
          <div style={{ background: "#1A1A1A", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#FF5F57","#FFBD2E","#28C840"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: "#111", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, maxWidth: 280, margin: "0 auto" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#5A5A5A" strokeWidth="2"/></svg>
              <span style={{ fontSize: 10, color: "#5A5A5A" }}>app.madger.app/dashboard</span>
            </div>
          </div>

          {/* Dashboard layout */}
          <div style={{ display: "flex", background: "#0D0D0D", minHeight: 480 }}>

            {/* ── Sidebar ── */}
            <div style={{ width: 200, background: "#111", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "16px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {/* Logo */}
              <div style={{ padding: "0 16px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
                <MadgerLogo size={26} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Madger</span>
              </div>
              {/* Nav */}
              {[
                { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Tableau de bord", active: true },
                { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", label: "Réservations", active: false },
                { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Clients", active: false },
                { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "Paiements", active: false },
                { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Statistiques", active: false },
                { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", label: "Messages", active: false, badge: 3 },
                { icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", label: "Paramètres", active: false },
              ].map(({ icon, label, active, badge }: { icon: string; label: string; active: boolean; badge?: number }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 16px", margin: "1px 8px", borderRadius: 8, background: active ? "rgba(203,255,3,0.08)" : "transparent", cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d={icon} stroke={active ? "#CBFF03" : "#5A5A5A"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 11, color: active ? "#CBFF03" : "#5A5A5A", fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
                  {badge && <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#CBFF03", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 7, fontWeight: 700, color: "#000" }}>{badge}</span></div>}
                </div>
              ))}

              {/* Coach profile at bottom */}
              <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&auto=format&q=80" size={28} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>Marie Laurent</div>
                  <div style={{ fontSize: 8, color: "#5A5A5A" }}>Plan Pro</div>
                </div>
                <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
              </div>
            </div>

            {/* ── Main content ── */}
            <div style={{ flex: 1, padding: "18px 20px", overflowX: "auto" }}>

              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Bonjour, Marie 👋</div>
                  <div style={{ fontSize: 10, color: "#5A5A5A", marginTop: 1 }}>Lundi 25 mai 2026 · 6 séances aujourd'hui</div>
                </div>
                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: "#CBFF03", fontSize: 10, fontWeight: 700, color: "#000", cursor: "pointer" }}>
                    + Nouvelle séance
                  </div>
                  <div style={{ position: "relative", width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round"/></svg>
                    <div style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, borderRadius: "50%", background: "#CBFF03", border: "1px solid #111" }} />
                  </div>
                </div>
              </div>

              {/* ── Lien de réservation ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "rgba(203,255,3,0.04)",
                  border: "1px solid rgba(203,255,3,0.18)",
                  marginBottom: 12,
                }}
              >
                {/* Link icon */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(203,255,3,0.1)", border: "1px solid rgba(203,255,3,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: "#5A5A5A", marginBottom: 1 }}>Votre lien de réservation</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#CBFF03", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    madger.app/marie-laurent
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {/* Copy button */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 7, background: "#CBFF03", cursor: "pointer" }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="#000" strokeWidth="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#000" strokeWidth="2"/>
                    </svg>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#000" }}>Copier</span>
                  </div>
                  {/* Share */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <circle cx="18" cy="5" r="3" stroke="#8A8A8A" strokeWidth="2"/>
                      <circle cx="6" cy="12" r="3" stroke="#8A8A8A" strokeWidth="2"/>
                      <circle cx="18" cy="19" r="3" stroke="#8A8A8A" strokeWidth="2"/>
                      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="#8A8A8A" strokeWidth="2"/>
                    </svg>
                    <span style={{ fontSize: 8, fontWeight: 600, color: "#8A8A8A" }}>Partager</span>
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              <div ref={statsRef} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                <StatCard label="Revenus ce mois"    value="1 240 €" delta="+18 %" inView={statsInView} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Séances ce mois"    value="24"      delta="+4"    inView={statsInView} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <StatCard label="Clients actifs"     value="12"      delta="+2"    inView={statsInView} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                <StatCard label="Taux de remplissage" value="87 %"   delta="+5 %" inView={statsInView} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </div>

              {/* Bottom row: bookings + messages + chart/clients */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 195px 155px", gap: 10 }}>

                {/* Left: today's bookings */}
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Séances du jour</span>
                    <span style={{ fontSize: 9, color: "#CBFF03", cursor: "pointer" }}>Voir le calendrier →</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {bookings.map((b, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 8, padding: "7px 9px", borderRadius: 8, background: i === 0 ? "rgba(203,255,3,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? "rgba(203,255,3,0.14)" : "rgba(255,255,255,0.05)"}` }}>
                        {/* Time */}
                        <div style={{ display: "flex", alignItems: "center", width: 32, flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 600, color: i === 0 ? "#CBFF03" : "#5A5A5A" }}>{b.time}</span>
                        </div>
                        {/* Accent line */}
                        <div style={{ width: 2, borderRadius: 2, background: i === 0 ? "#CBFF03" : "rgba(255,255,255,0.08)", flexShrink: 0, alignSelf: "stretch" }} />
                        {/* Avatar */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Avatar src={`https://images.unsplash.com/${b.photo}?w=60&h=60&fit=crop&auto=format&q=80`} size={22} />
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{b.name}</div>
                          <div style={{ fontSize: 8, color: "#5A5A5A" }}>{b.type} · {b.duration}</div>
                          <div
                            style={{ fontSize: 8, color: "#CBFF03", marginTop: 2, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Voir les objectifs
                          </div>
                        </div>
                        {/* Paid badge — centré verticalement */}
                        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ padding: "3px 7px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center" }}>
                            <span style={{ fontSize: 7, color: "#4ADE80", fontWeight: 600, lineHeight: 1 }}>Payé</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Middle: messages */}
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Messages</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ padding: "1px 6px", borderRadius: 20, background: "#CBFF03", fontSize: 7, fontWeight: 700, color: "#000" }}>3</div>
                      <span style={{ fontSize: 9, color: "#CBFF03", cursor: "pointer" }}>Tout voir →</span>
                    </div>
                  </div>

                  {/* Conversation list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
                    {[
                      { photo: "photo-1507003211169-0a1dd7228f2d", name: "Julien Martin",  msg: "Top, à mercredi alors 💪",         time: "9:12",  unread: 1,  active: true },
                      { photo: "photo-1438761681033-6461ffad8d80", name: "Sophie Blanc",   msg: "Est-ce que je peux décaler à 11h ?", time: "hier",  unread: 2,  active: false },
                      { photo: "photo-1472099645785-5658abf4ff4e", name: "Romain Duval",   msg: "Merci pour les exercices 🙏",       time: "hier",  unread: 0,  active: true },
                      { photo: "photo-1544005313-94ddf0286df2", name: "Clara Morin",    msg: "J'ai une question sur mon programme", time: "lun.",  unread: 0,  active: false },
                    ].map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 7px", borderRadius: 8, background: i === 1 ? "rgba(203,255,3,0.04)" : "transparent", border: `1px solid ${i === 1 ? "rgba(203,255,3,0.10)" : "transparent"}`, cursor: "pointer" }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <Avatar src={`https://images.unsplash.com/${m.photo}?w=60&h=60&fit=crop&auto=format&q=80`} size={24} />
                          {m.active && <div style={{ position: "absolute", bottom: 0, right: 0, width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", border: "1px solid #0D0D0D" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
                            <span style={{ fontSize: 9, fontWeight: m.unread ? 700 : 500, color: m.unread ? "#fff" : "#8A8A8A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 90 }}>{m.name}</span>
                            <span style={{ fontSize: 7, color: "#5A5A5A", flexShrink: 0 }}>{m.time}</span>
                          </div>
                          <div style={{ fontSize: 8, color: m.unread ? "#8A8A8A" : "#5A5A5A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.msg}</div>
                        </div>
                        {m.unread > 0 && (
                          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#CBFF03", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 7, fontWeight: 700, color: "#000" }}>{m.unread}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active conversation preview */}
                  <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <Avatar src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format&q=80" size={18} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#fff" }}>Sophie Blanc</span>
                      <div style={{ marginLeft: "auto", padding: "1px 5px", borderRadius: 10, background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.2)" }}>
                        <span style={{ fontSize: 7, color: "#FFA500" }}>En attente</span>
                      </div>
                    </div>
                    {/* Messages */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ padding: "4px 8px", borderRadius: "8px 8px 2px 8px", background: "#CBFF03", maxWidth: "80%" }}>
                        <span style={{ fontSize: 8, color: "#000", fontWeight: 500 }}>Bonjour Sophie ! Oui pas de souci pour 11h 😊</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: "4px 8px", borderRadius: "8px 8px 8px 2px", background: "rgba(255,255,255,0.07)", maxWidth: "80%" }}>
                        <span style={{ fontSize: 8, color: "#fff" }}>Est-ce que je peux décaler à 11h ?</span>
                      </div>
                    </div>
                    {/* Input */}
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 7px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: 8, color: "#5A5A5A", flex: 1 }}>Répondre à Sophie…</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

                {/* Right: revenue chart + goal + activity */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Revenue this week */}
                  <div style={{ padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Cette semaine</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#CBFF03" }}>428 €</span>
                    </div>
                    <RevenueChart />
                  </div>

                  {/* Objectif mensuel */}
                  <div style={{ padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Objectif mai</span>
                      <span style={{ fontSize: 8, color: "#5A5A5A" }}>1 240 / 1 500 €</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 5, borderRadius: 10, background: "rgba(255,255,255,0.06)", marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "82.7%", borderRadius: 10, background: "linear-gradient(90deg, #9DCC00, #CBFF03)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 7, color: "#4ADE80", fontWeight: 600 }}>83 % atteint</span>
                      <span style={{ fontSize: 7, color: "#5A5A5A" }}>Reste 260 €</span>
                    </div>
                    {/* Mini séances progress */}
                    <div style={{ marginTop: 8, height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 7 }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 8, color: "#5A5A5A" }}>Séances</span>
                      <span style={{ fontSize: 8, color: "#fff", fontWeight: 600 }}>24 / 30</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 10, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "80%", borderRadius: 10, background: "rgba(203,255,3,0.5)" }} />
                    </div>
                  </div>

                  {/* Répartition clients */}
                  <div style={{ padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", flex: 1 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Répartition</div>
                    {[
                      { label: "Coaching indiv.", pct: 58, color: "#CBFF03" },
                      { label: "Suivi mensuel",   pct: 25, color: "#4ADE80" },
                      { label: "Prépa physique",  pct: 17, color: "rgba(203,255,3,0.35)" },
                    ].map(({ label, pct, color }) => (
                      <div key={label} style={{ marginBottom: 7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 8, color: "#8A8A8A" }}>{label}</span>
                          <span style={{ fontSize: 8, color: "#fff", fontWeight: 600 }}>{pct} %</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 10, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 10, background: color }} />
                        </div>
                      </div>
                    ))}

                    {/* Clients actifs */}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 8, color: "#5A5A5A", marginBottom: 6 }}>Actifs ce mois</div>
                      <div style={{ display: "flex", gap: -4 }}>
                        {clients.map((c, i) => (
                          <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0D0D0D", marginLeft: i > 0 ? -6 : 0 }}>
                            <img src={`https://images.unsplash.com/${c.photo}?w=60&h=60&fit=crop&auto=format&q=80`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
                          </div>
                        ))}
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1.5px solid #0D0D0D", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 7, color: "#8A8A8A", fontWeight: 600 }}>+8</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Invoices row */}
              <div style={{ marginTop: 10, padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Factures</span>
                    {/* Compliance badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="rgba(74,222,128,0.2)" stroke="#4ADE80" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize: 8, color: "#4ADE80", fontWeight: 600 }}>Conformes réforme e-facture 2026</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: "#CBFF03", cursor: "pointer" }}>Télécharger tout →</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {[
                    { ref: "FAC-024", client: "Julien Martin",  date: "2 mai",    montant: "160 €", status: "paid" },
                    { ref: "FAC-023", client: "Sophie Blanc",   date: "2 mai",    montant: "50 €",  status: "paid" },
                    { ref: "FAC-022", client: "Romain Duval",   date: "25 avr.",  montant: "80 €",  status: "paid" },
                    { ref: "FAC-021", client: "Clara Morin",    date: "25 avr.",  montant: "50 €",  status: "paid" },
                    { ref: "FAC-020", client: "Julien Martin",  date: "18 avr.",  montant: "160 €", status: "paid" },
                  ].map((f, i) => (
                    <div key={i} style={{ padding: "9px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(203,255,3,0.08)", border: "1px solid rgba(203,255,3,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#CBFF03" strokeWidth="2"/><path d="M14 2v6h6M16 13H8M16 17H8" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                        <div style={{ padding: "1px 5px", borderRadius: 10, background: f.status === "paid" ? "rgba(74,222,128,0.1)" : "rgba(255,165,0,0.1)", border: `1px solid ${f.status === "paid" ? "rgba(74,222,128,0.2)" : "rgba(255,165,0,0.2)"}` }}>
                          <span style={{ fontSize: 7, color: f.status === "paid" ? "#4ADE80" : "#FFA500", fontWeight: 600 }}>{f.status === "paid" ? "Payée" : "En attente"}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{f.ref}</div>
                        <div style={{ fontSize: 8, color: "#5A5A5A", marginTop: 1 }}>{f.client}</div>
                        <div style={{ fontSize: 8, color: "#5A5A5A" }}>{f.date}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#CBFF03" }}>{f.montant}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ fontSize: 7, color: "#8A8A8A" }}>PDF</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </motion.div>
        </div>

        {/* Feature pills below mockup — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden md:flex flex-wrap justify-center gap-3 mt-10"
        >
          {[
            "Réservations en temps réel",
            "Paiements automatiques",
            "Factures générées",
            "Rappels clients",
            "Synchro Google Calendar",
            "0 % de commission en Pro",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8A8A8A" }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5l-7 7-3-3" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
