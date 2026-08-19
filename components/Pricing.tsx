"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";
import MadgerLogo from "@/components/ui/MadgerLogo";
import CoachAside from "@/components/ui/CoachAside";

const freeFeatures = [
  "Lien public personnalisé",
  "Réservations et paiements illimités",
  "Factures conformes automatiques",
  "Synchronisation Google Calendar",
  "Rappels automatiques",
];

const proFeatures = [
  "Tout le plan Gratuit",
  "0 % de commission Madger",
  "Statistiques avancées",
  "Support prioritaire",
];

const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
};

function Check() {
  return (
    <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing({ launched = false }: { launched?: boolean }) {
  const ctaHref = launched ? "/signup" : "#early-access";
  return (
    <section
      id="tarifs"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.01), transparent)",
      }}
    >
      <CoachAside line="Démarre sans engagement." src="/character/coach-ok.webp" side="right" inset={12} />
      <div className="max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 flex flex-col items-center"
        >
          <SectionLabel>Tarifs</SectionLabel>
          <h2
            className="font-extrabold text-white mb-5"
            style={{ fontSize: "clamp(32px, 4.5vw, 58px)", letterSpacing: "-0.035em", lineHeight: 1.04 }}
          >
            Transparent dès le départ.<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Aucune surprise au lancement.</span>
          </h2>
          <p className="text-text-muted text-lg max-w-lg mx-auto mb-6" style={{ lineHeight: 1.6 }}>
            Gratuit pour démarrer, Pro à 49 € HT par mois quand tu veux aller plus loin. Et chaque nouveau compte démarre avec 14 jours de Pro offerts.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: "rgba(203,255,3,0.07)", border: "1px solid rgba(203,255,3,0.18)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-accent block" style={{ background: "#CBFF03" }} />
            <span style={{ color: "#CBFF03", fontSize: 12, fontWeight: 600 }}>
              {launched
                ? "14 jours de Pro offerts à chaque nouveau compte · Sans carte bancaire"
                : "Accès anticipé · Madger Pro offert 3 mois pour les premiers membres"}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto pt-6" style={{ overflow: "visible" }}>

          {/* ── Free ── */}
          <motion.div
            className="spotlight-card card-hover-glow h-full p-5 sm:p-10 rounded-2xl sm:rounded-3xl"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            onMouseMove={handleSpotlight}
          >
            <div className="relative" style={{ zIndex: 2 }}>
              <div className="flex items-center gap-2.5 mb-3">
                <MadgerLogo size={28} />
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A", letterSpacing: "0.1em" }}>
                  Gratuit
                </div>
              </div>
              <div style={{ minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="font-extrabold text-white mb-1" style={{ fontSize: "clamp(24px, 6.5vw, 52px)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  0 €
                </div>
                <div className="text-text-muted text-sm pt-1">
                  pour toujours · 5 % de commission par séance encaissée en ligne
                </div>
              </div>
              <a
                href={ctaHref}
                className="block w-full text-center text-white text-xs sm:text-sm font-semibold py-2.5 sm:py-3 rounded-full mb-5 sm:mb-7 transition-all duration-200 whitespace-nowrap"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              >
                <span className="sm:hidden">{launched ? "Commencer →" : "Rejoindre →"}</span>
                <span className="hidden sm:inline">{launched ? "Commencer gratuitement →" : "Rejoindre l'accès anticipé →"}</span>
              </a>
              <div className="my-5 sm:my-7" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <ul className="flex flex-col gap-2 sm:gap-3">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-white">
                    <span className="flex-shrink-0" style={{ marginTop: 1 }}><Check /></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ── Pro ── wrapper pour badge flottant */}
          <div className="relative h-full" style={{ overflow: "visible" }}>

            {/* Badge flottant - positionné par rapport au wrapper, pas la carte */}
            <div
              className="absolute -top-3 right-0 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-black font-bold text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap"
              style={{ background: "#CBFF03", letterSpacing: "0.07em", zIndex: 20 }}
            >
              Recommandé
            </div>

          <motion.div
            className="spotlight-card rounded-3xl relative h-full"
            style={{
              background: "linear-gradient(160deg, rgba(203,255,3,0.07), rgba(203,255,3,0.02) 60%, transparent)",
              border: "1px solid rgba(203,255,3,0.28)",
              boxShadow: "0 0 60px rgba(203,255,3,0.06)",
              transition: "box-shadow 400ms ease",
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onMouseMove={handleSpotlight}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 80px rgba(203,255,3,0.14), 0 0 0 1px rgba(203,255,3,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 60px rgba(203,255,3,0.06)")}
          >

            <div className="p-5 sm:p-10 relative" style={{ zIndex: 2 }}>
              {/* Logo + label */}
              <div className="flex items-center gap-2.5 mb-3">
                <MadgerLogo size={28} />
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#CBFF03", letterSpacing: "0.1em" }}>
                  Madger Pro
                </div>
              </div>

              <div style={{ minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="font-extrabold text-white mb-1" style={{ fontSize: "clamp(22px, 5.5vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.05 }}>
                  49 € HT<span style={{ fontSize: "0.45em", fontWeight: 700, color: "#9a9a9a" }}> / mois</span>
                </div>
                <div className="text-text-muted text-sm pt-1">
                  ou 490 € HT par an (2 mois offerts) · 14 jours d'essai offerts à l'inscription
                </div>
              </div>

              <motion.a
                href={ctaHref}
                className="block w-full text-center text-black text-xs sm:text-sm font-semibold py-2.5 sm:py-3 rounded-full mb-5 sm:mb-7 whitespace-nowrap"
                style={{ background: "#CBFF03" }}
                whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.5), 0 0 60px rgba(203,255,3,0.2)" }}
                transition={{ duration: 0.2 }}
              >
                <span className="sm:hidden">{launched ? "Essayer Pro →" : "Rejoindre →"}</span>
                <span className="hidden sm:inline">{launched ? "Essayer Pro 14 jours →" : "Rejoindre l'accès anticipé →"}</span>
              </motion.a>

              <div className="my-5 sm:my-7" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
              <ul className="flex flex-col gap-2 sm:gap-3">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-white">
                    <span className="flex-shrink-0" style={{ marginTop: 1 }}><Check /></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
          </div>
        </div>

        {/* Bande vide : Léo se tient dans le noir sous les cartes, sans les chevaucher */}
        <div aria-hidden className="h-24 sm:h-52" />
      </div>
    </section>
  );
}
