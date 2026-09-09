"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

// Section « Réserver. Encaisser. Facturer. » : les trois gestes que Madger
// automatise, chacun illustré par un fragment d'écran du produit (mêmes
// données qu'Emma Laurent dans les autres maquettes). Volontairement épuré :
// un numéro, un titre, une phrase, un écran. Pas d'icône.

const STEPS = [
  {
    n: "01",
    title: "Réserver",
    text: "Ton client ouvre ton lien, choisit sa prestation et son créneau. Tu n'as rien calé.",
    screen: <BookingScreen />,
  },
  {
    n: "02",
    title: "Encaisser",
    text: "Il paie en réservant. La séance est payée avant d'être donnée, tes règles d'annulation s'appliquent seules.",
    screen: <PaymentScreen />,
  },
  {
    n: "03",
    title: "Facturer",
    text: "La facture part toute seule, numérotée, avec tes mentions légales. Ton export comptable est prêt.",
    screen: <InvoiceScreen />,
  },
];

const SLOTS = ["07:00", "08:00", "12:30", "18:00", "19:00"];

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4"
      style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 40px rgba(203,255,3,0.04)" }}
    >
      {children}
    </div>
  );
}

function BookingScreen() {
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-white">Séance individuelle</span>
        <span className="text-[13px] font-semibold text-white">45 €</span>
      </div>
      <p className="mt-0.5 text-[11px] text-text-dim">1 h · en salle · Emma Laurent</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">Mardi 15 sept.</span>
        <span className="text-[11px] text-text-dim">5 créneaux</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {SLOTS.map((s) => {
          const on = s === "18:00";
          return (
            <span
              key={s}
              className="rounded-lg py-2 text-center text-[11px] font-semibold"
              style={
                on
                  ? { background: "#CBFF03", color: "#000" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#C9C9C4" }
              }
            >
              {s}
            </span>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl py-2.5 text-center text-[12px] font-bold text-black" style={{ background: "#CBFF03" }}>
        Réserver et payer 45 €
      </div>
    </Frame>
  );
}

function PaymentScreen() {
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">Paiement reçu</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "rgba(203,255,3,0.12)", color: "#CBFF03", border: "1px solid rgba(203,255,3,0.25)" }}
        >
          Payée
        </span>
      </div>
      <p className="mt-2 text-[26px] font-extrabold text-white" style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>
        45,00 €
      </p>
      <div className="mt-4 space-y-2 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Client</span>
          <span className="text-white">Julie Marchand</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Séance</span>
          <span className="text-white">Mar. 15 sept. · 18:00</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Moyen</span>
          <span className="text-white">Apple Pay</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
          <span className="text-text-dim">Annulation</span>
          <span className="text-white">Gratuite jusqu&apos;à 24 h avant</span>
        </div>
      </div>
    </Frame>
  );
}

function InvoiceScreen() {
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">Facture</span>
        <span className="text-[11px] text-text-dim">PDF</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-[15px] font-bold text-white" style={{ letterSpacing: "-0.01em" }}>F-2026-0042</span>
        <span className="text-[15px] font-bold text-white">45,00 €</span>
      </div>
      <p className="mt-0.5 text-[11px] text-text-dim">Julie Marchand · Séance individuelle · 15 sept. 2026</p>
      <div className="mt-4 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "rgba(203,255,3,0.12)", color: "#CBFF03", border: "1px solid rgba(203,255,3,0.25)" }}
        >
          Envoyée au client
        </span>
        <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-text-dim">
          SIRET · TVA
        </span>
      </div>
      <div className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-text-dim">
        Numérotée sans trou · avoir automatique si remboursement · export CSV
      </div>
    </Frame>
  );
}

export default function ThreeSteps() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(203,255,3,0.04), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-col items-center text-center sm:mb-16"
        >
          <SectionLabel>Comment ça marche</SectionLabel>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(30px, 5vw, 60px)", letterSpacing: "-0.04em", lineHeight: 1.02 }}
          >
            Réserver. Encaisser.{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Facturer.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-text-muted" style={{ fontSize: 16, lineHeight: 1.6 }}>
            Trois gestes, tous automatiques. Toi, tu coaches.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col md:px-8"
              style={i > 0 ? { borderLeft: "1px solid rgba(255,255,255,0.06)" } : undefined}
            >
              <div className="border-t border-white/[0.08] pt-5">
                <span className="text-[12px] font-semibold tracking-[0.14em]" style={{ color: "#CBFF03" }}>
                  {s.n}
                </span>
                <h3
                  className="mt-2 font-extrabold text-white"
                  style={{ fontSize: "clamp(22px, 2.4vw, 28px)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] text-text-muted" style={{ lineHeight: 1.6 }}>
                  {s.text}
                </p>
              </div>
              <div className="mt-6">{s.screen}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
