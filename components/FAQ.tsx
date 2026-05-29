"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const faqs = [
  {
    q: "Quand Madger sera-t-il disponible ?",
    a: "Madger est en phase d'accès anticipé. Les coachs qui s'inscrivent maintenant sont sélectionnés manuellement et accèdent en priorité au lancement, avec le plan Pro offert pendant 6 mois. On vous contacte directement dès que votre accès est prêt.",
  },
  {
    q: "Comment fonctionne le lien coach ?",
    a: "Vous obtenez une page personnalisée à votre nom - par exemple madger.app/marie. Vous la partagez en bio Instagram, en signature d'email, partout. Vos clients y voient vos offres, choisissent leur créneau et paient directement. Aucune installation, aucune friction.",
  },
  {
    q: "Mes clients doivent-ils créer un compte ?",
    a: "Non. Vos clients réservent et paient en quelques clics, sans créer de compte. Ils reçoivent une confirmation et leur facture par email immédiatement. L'expérience est pensée pour être la plus simple possible de leur côté.",
  },
  {
    q: "Madger est-il adapté à mon type de coaching ?",
    a: "Oui. Que vous soyez coach sportif, préparateur physique, coach bien-être, développement personnel ou business - Madger s'adapte à toutes les formes de coaching individuel. En présentiel, en visio ou les deux.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Le paiement est encaissé au moment de la réservation via Stripe. Votre client paie par carte, Apple Pay ou Google Pay. Vous recevez l'argent directement sur votre compte bancaire. Plus jamais de relances.",
  },
  {
    q: "Mes données et celles de mes clients sont-elles sécurisées ?",
    a: "Toutes les données sont hébergées en Europe. Les paiements transitent via Stripe, certifié PCI-DSS niveau 1 - le standard de sécurité le plus élevé. Nous ne revendons aucune donnée. Vous gardez le contrôle total.",
  },
  {
    q: "Puis-je gérer plusieurs types de séances ?",
    a: "Oui. Vous créez autant d'offres que vous voulez : séance découverte, coaching individuel, suivi mensuel, pack séances… Chaque offre a son tarif, sa durée et ses disponibilités. Vos clients voient toutes vos offres et choisissent celle qui leur convient.",
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
