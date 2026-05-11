"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const faqs = [
  {
    q: "Quelle est la différence entre Madger et Calendly ?",
    a: "Calendly gère uniquement la prise de rendez-vous. Madger gère l'intégralité de votre activité : réservation, paiement Stripe au moment de la résa, facturation automatique conforme, rappels clients et dashboard complet. C'est pensé spécifiquement pour les coachs en France.",
  },
  {
    q: "Faut-il avoir un statut auto-entrepreneur ou une entreprise ?",
    a: "Non, pas obligatoirement pour commencer. Madger s'adapte à votre situation : auto-entrepreneur, SASU, association... Si vous êtes en cours de création, vous pouvez déjà mettre en place votre page et tester la plateforme.",
  },
  {
    q: "Que se passe-t-il si un client veut annuler ?",
    a: "Vous définissez votre politique d'annulation (délai, remboursement total ou partiel). Madger l'applique automatiquement. Le client voit les conditions avant de réserver, aucune surprise, aucune discussion gênante.",
  },
  {
    q: "Stripe prend-il des frais en plus de la commission Madger ?",
    a: "Stripe prélève 1,5 % + 0,25 € par transaction pour les cartes européennes. Ces frais sont standard et indépendants de Madger. Sur le plan Pro, la commission Madger passe à 0 %, donc vous ne payez que les frais Stripe.",
  },
  {
    q: "Mes données et celles de mes clients sont-elles sécurisées ?",
    a: "Toutes les données sont hébergées en Europe (AWS eu-west). Les paiements transitent via Stripe (certifié PCI-DSS niveau 1). Nous ne revendons aucune donnée. Vous pouvez exporter ou supprimer vos données à tout moment.",
  },
  {
    q: "Est-ce que Madger fonctionne pour les séances en visio ?",
    a: "Oui. Vous pouvez proposer des séances en présentiel, en visio (avec lien Zoom ou Meet généré automatiquement) ou les deux. Votre client choisit au moment de la réservation.",
  },
  {
    q: "Que se passe-t-il à la fin de la période early access ?",
    a: "Les premiers coachs qui rejoignent bénéficient du plan Pro offert 6 mois. Ensuite, vous choisissez librement de continuer en Free (5 % de commission) ou de passer Pro (49 €/mois ou 490 €/an, 0 % de commission). Aucun engagement, résiliable à tout moment.",
  },
];

function Item({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-semibold text-white" style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.4 }}>{q}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: isOpen ? "#CBFF03" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke={isOpen ? "#000" : "#8A8A8A"} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p className="pb-5 text-text-muted" style={{ fontSize: 15, lineHeight: 1.75, maxWidth: 680 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 relative">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-12"
        >
          <SectionLabel>FAQ</SectionLabel>
          <h2
            className="font-extrabold text-white mb-4"
            style={{ fontSize: "clamp(26px, 4vw, 44px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Les questions qu'on nous<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>pose le plus souvent.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "0 24px",
          }}
        >
          {faqs.map((faq, i) => (
            <Item
              key={i}
              q={faq.q}
              a={faq.a}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-sm"
          style={{ color: "#5A5A5A" }}
        >
          Une autre question ?{" "}
          <a href="mailto:contact@madger.app" style={{ color: "#CBFF03", textDecoration: "none" }}>
            contact@madger.app
          </a>
        </motion.p>
      </div>
    </section>
  );
}
