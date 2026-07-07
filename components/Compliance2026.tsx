"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

// Section conformité : la réforme française de la facturation électronique
// (2026-2027) devient un argument produit. Ton sobre, promesse concrète :
// avec Madger, le coach est déjà en règle et n'aura rien à changer.

const items = [
  {
    title: "Factures conformes, générées seules",
    desc: "Chaque séance encaissée produit une facture numérotée avec vos mentions légales : SIRET, adresse, mention TVA. Zéro saisie.",
  },
  {
    title: "Une facture de commission par mois",
    desc: "Madger vous adresse chaque mois une facture claire pour sa commission. Votre comptabilité est carrée, des deux côtés.",
  },
  {
    title: "Export comptable en un clic",
    desc: "Toute votre année (encaissements, remboursements, commissions, net versé) au format CSV, prête pour votre expert-comptable.",
  },
  {
    title: "Factur-X automatique",
    desc: "Le format électronique prévu par la réforme sera activé pour vous au moment voulu. Vous ne changez rien à vos habitudes.",
  },
];

export default function Compliance2026() {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(203,255,3,0.03), transparent 70%)" }}
      />
      <div className="max-w-5xl mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-12"
        >
          <SectionLabel>Conformité</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(26px, 4vw, 44px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Facturation électronique 2026.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Vous êtes déjà prêt.
            </span>
          </h2>
          <p className="text-text-muted text-base max-w-xl mx-auto" style={{ lineHeight: 1.6 }}>
            La réforme française impose la facture électronique à toutes les
            entreprises, micro-entrepreneurs compris. Pendant que d&apos;autres
            chercheront un logiciel, vos factures seront déjà en règle.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.07)",
                background: "#141414",
                padding: "22px 24px",
              }}
            >
              <div
                className="flex items-center justify-center mb-4"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(203,255,3,0.08)",
                  border: "1px solid rgba(203,255,3,0.2)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CBFF03" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 13h6M9 17h6" />
                </svg>
              </div>
              <p className="text-white font-bold mb-1.5" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>
                {item.title}
              </p>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-8"
          style={{ fontSize: 12, color: "var(--text-dim)" }}
        >
          Réforme de la facturation électronique française : réception dès
          septembre 2026, émission généralisée en 2027.
        </motion.p>
      </div>
    </section>
  );
}
