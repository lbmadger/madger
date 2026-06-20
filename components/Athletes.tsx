"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

const CARDS = [
  {
    photo: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1000&fit=crop&auto=format&q=85",
    tag: "Gain de temps",
    title: "Récupérez 5h\npar semaine",
    desc: "Réservations, paiements et factures générées automatiquement à chaque séance. Vous faites ce pour quoi vous êtes payé : coacher.",
  },
  {
    photo: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=1000&fit=crop&auto=format&q=85",
    tag: "Revenus sécurisés",
    title: "Payé avant\nla séance",
    desc: "Le paiement est encaissé à la réservation. Plus jamais de relances à gérer.",
  },
  {
    photo: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=1000&fit=crop&auto=format&q=85",
    tag: "Image pro",
    title: "Un lien\nqui vend",
    desc: "Votre page coach premium à partager en bio Instagram, en signature, partout.",
  },
];

export default function Athletes() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-10 sm:mb-14"
        >
          <SectionLabel>Fait pour les coachs</SectionLabel>
          <h2
            className="font-extrabold text-white max-w-2xl"
            style={{ fontSize: "clamp(32px, 4.5vw, 58px)", letterSpacing: "-0.035em", lineHeight: 1.04 }}
          >
            Coacher, c'est votre métier.{" "}
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Pas gérer des tableurs.
            </span>
          </h2>
        </motion.div>

        {/* Grid photos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
              style={{
                aspectRatio: "3/4",
                background:
                  "linear-gradient(160deg, #1a2400 0%, #0a0f00 55%, #050505 100%)",
                border: "1px solid rgba(203,255,3,0.10)",
              }}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.015 }}
            >
              {/* Halo accent lime - émane derrière le sujet */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(203,255,3,0.45), rgba(203,255,3,0.12) 50%, transparent 75%)",
                  pointerEvents: "none",
                }}
              />

              {/* Photo - luminosité pure pour effet cutout teinté marque */}
              <img
                src={card.photo}
                alt={card.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: "grayscale(1) contrast(1.25) brightness(1.05)",
                  mixBlendMode: "luminosity",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 78% 70% at 50% 38%, black 50%, transparent 92%)",
                  maskImage:
                    "radial-gradient(ellipse 78% 70% at 50% 38%, black 50%, transparent 92%)",
                }}
              />

              {/* Vignette bas → fond carte */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, transparent 50%, rgba(5,5,5,0.65) 78%, #050505 100%)",
                  pointerEvents: "none",
                }}
              />

              {/* Texte en bas */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "0 22px 26px",
                }}
              >
                {/* Tag */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#CBFF03",
                    background: "rgba(203,255,3,0.09)",
                    border: "1px solid rgba(203,255,3,0.22)",
                    padding: "4px 10px",
                    borderRadius: 100,
                    marginBottom: 10,
                  }}
                >
                  <span
                    className="glow-dot"
                    style={{ width: 4, height: 4, borderRadius: "50%", background: "#CBFF03", display: "block" }}
                  />
                  {card.tag}
                </div>

                {/* Titre */}
                <div
                  style={{
                    fontSize: "clamp(18px, 2.2vw, 22px)",
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 8,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                    whiteSpace: "pre-line",
                  }}
                >
                  {card.title}
                </div>

                {/* Description */}
                <div style={{ fontSize: 13, color: "#8A8A8A", lineHeight: 1.55 }}>
                  {card.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
