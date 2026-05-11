"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";

export default function EarlyAccessForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="early-access" className="py-28 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(203,255,3,0.08), transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-xl mx-auto p-7 sm:p-10 md:p-14 rounded-3xl text-center"
          style={{
            background: "linear-gradient(180deg, #141414, #111111)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Bordure lumineuse */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(203,255,3,0.4), transparent 50%)",
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              padding: "1px",
            }}
          />

          {/* Logo carré centré au-dessus du titre */}
          <div className="flex justify-center mb-6">
            <div style={{ filter: "drop-shadow(0 0 24px rgba(203,255,3,0.45))" }}>
              <MadgerLogo size={56} />
            </div>
          </div>

          <h2
            className="font-extrabold text-white mb-4"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Rejoignez les premiers coachs Madger.
          </h2>
          <p className="text-text-muted text-lg leading-relaxed mb-6">
            Les premiers coachs accèdent au plan Pro offert pendant 6 mois (d'une valeur de 294€) !
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex" style={{ gap: 0 }}>
              {[
                { initials: "C", color: "#7C6FCD" },
                { initials: "T", color: "#4A90D9" },
                { initials: "S", color: "#E07B4A" },
                { initials: "R", color: "#4ADE80" },
              ].map(({ initials, color }, i) => (
                <div
                  key={initials}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: color,
                    border: "2px solid #111",
                    marginLeft: i > 0 ? -8 : 0,
                    position: "relative",
                    zIndex: 4 - i,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff",
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Plusieurs coachs</span> testent déjà la bêta
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
  key="form"
  onSubmit={handleSubmit}
  className="flex flex-col gap-3 text-left"
  initial={{ opacity: 1 }}
  exit={{ opacity: 0, y: -10 }}
>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Prénom <span style={{ color: "#ef4444" }}>*</span></span>
      <input
        type="text"
        placeholder="Prénom"
        required
        className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
        onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
      />
    </label>
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Nom <span style={{ color: "#ef4444" }}>*</span></span>
      <input
        type="text"
        placeholder="Nom"
        required
        className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
        onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
      />
    </label>
  </div>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Adresse email <span style={{ color: "#ef4444" }}>*</span></span>
    <input
      type="email"
      placeholder="vous@exemple.com"
      required
      className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  </label>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Téléphone <span style={{ color: "#ef4444" }}>*</span></span>
    <input
      type="tel"
      placeholder="+33 6 00 00 00 00"
      required
      className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  </label>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Type de coaching <span style={{ color: "#ef4444" }}>*</span></span>
    <select
      required
      defaultValue=""
      onChange={(e) => { e.target.style.color = e.target.value ? "#ffffff" : "#5A5A5A"; }}
      className="w-full px-5 py-3.5 rounded-xl text-sm outline-none appearance-none"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#5A5A5A",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A8A8A' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 18px center",
        paddingRight: "44px",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    >
      <option value="" disabled style={{ color: "#5A5A5A", background: "#141414" }}>Sélectionner</option>
      <option style={{ color: "#fff", background: "#141414" }}>Coach sportif / fitness</option>
      <option style={{ color: "#fff", background: "#141414" }}>Préparateur physique</option>
      <option style={{ color: "#fff", background: "#141414" }}>Coach bien-être</option>
      <option style={{ color: "#fff", background: "#141414" }}>Coach en développement personnel</option>
      <option style={{ color: "#fff", background: "#141414" }}>Coach business / accompagnement</option>
      <option style={{ color: "#fff", background: "#141414" }}>Autre</option>
    </select>
  </label>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Nombre de clients actifs <span style={{ color: "#ef4444" }}>*</span></span>
    <select
      required
      defaultValue=""
      onChange={(e) => { e.target.style.color = e.target.value ? "#ffffff" : "#5A5A5A"; }}
      className="w-full px-5 py-3.5 rounded-xl text-sm outline-none appearance-none"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#5A5A5A",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A8A8A' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 18px center",
        paddingRight: "44px",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    >
      <option value="" disabled style={{ color: "#5A5A5A", background: "#141414" }}>Sélectionner</option>
      <option style={{ color: "#fff", background: "#141414" }}>Moins de 5</option>
      <option style={{ color: "#fff", background: "#141414" }}>5 à 15</option>
      <option style={{ color: "#fff", background: "#141414" }}>15 à 30</option>
      <option style={{ color: "#fff", background: "#141414" }}>Plus de 30</option>
    </select>
  </label>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Instagram ou site <span style={{ color: "#5A5A5A" }}>(optionnel)</span></span>
    <input
      type="text"
      placeholder="@votre_compte ou https://..."
      className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  </label>

  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>Votre principal défi dans la gestion de vos séances <span style={{ color: "#ef4444" }}>*</span></span>
    <textarea
      placeholder="Ex : je passe trop de temps sur les relances et la facturation…"
      required
      rows={3}
      className="w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none resize-none"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
      onFocus={(e) => (e.target.style.borderColor = "#CBFF03")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  </label>

  <motion.button
    type="submit"
    className="w-full py-4 rounded-xl text-black font-semibold text-sm mt-2"
    style={{ background: "#CBFF03" }}
    whileHover={{ backgroundColor: "#ffffff", boxShadow: "0 0 30px rgba(203,255,3,0.3)" }}
    whileTap={{ scale: 0.98 }}
  >
    Rejoindre l'early access
  </motion.button>
</motion.form>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-5 px-6 rounded-xl text-accent font-medium text-sm"
                style={{
                  background: "rgba(203,255,3,0.08)",
                  border: "1px solid rgba(203,255,3,0.2)",
                }}
              >
                Demande reçue. Vous recevrez un email sous 48h pour démarrer votre test Madger.
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-text-dim text-xs mt-7">
            Aucun spam. Sortie prévue dans les prochaines semaines.
          </p>
        </motion.div>
      </div>
    </section>
  );
}