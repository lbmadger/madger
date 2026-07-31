"use client";

import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

// Section "conviction" : remplace les anciens témoignages (le produit n'est
// pas encore lancé, aucun vrai coach ne l'utilise). Mot honnête du fondateur,
// à la première personne — aucune fausse identité, photo ou métrique.
export default function Testimonials() {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(203,255,3,0.03), transparent 70%)" }}
      />

      <div className="max-w-3xl mx-auto px-5 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-10 sm:mb-12"
        >
          <SectionLabel>Le mot du fondateur</SectionLabel>
          <h2
            className="font-extrabold text-white"
            style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            La conviction derrière{" "}
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Madger.</span>
          </h2>
        </motion.div>

        {/* Manifeste */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="p-7 sm:p-10 rounded-3xl"
          style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex flex-col gap-5" style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-soft)" }}>
            <p>
              Tout le monde voit le même problème&nbsp;: les coachs perdent des heures en
              administratif. La plupart en concluent qu'il faut un meilleur agenda. Ils se
              trompent de problème.
            </p>
            <p>
              Le vrai sujet, ce n'est pas le calendrier. C'est que la réservation, le paiement
              et la facture sont trois moments séparés, gérés par trois outils qui ne se
              parlent pas. Chaque couture entre ces outils, c'est un message WhatsApp, une
              relance gênante, une facture refaite à minuit.
            </p>
            <p>
              Madger supprime les coutures. Un seul lien, et les trois moments n'en font plus
              qu'un&nbsp;: le client réserve, il a payé, la facture est partie. Ce n'est pas un
              outil de plus, c'est <span className="text-white font-semibold">trois outils en moins</span>.
            </p>
            <p>
              Et on le construit <span className="text-white font-semibold">avec</span> les
              coachs, pas pour eux. Chaque retour des premiers membres décide de ce qu'on code
              la semaine suivante. C'est comme ça qu'on fait un produit juste&nbsp;: en écoutant
              le terrain plus fort que ses propres idées.
            </p>
          </div>

          {/* Signature */}
          <div className="flex items-center gap-3 mt-7 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(203,255,3,0.10)",
                border: "1px solid rgba(203,255,3,0.25)",
                color: "#CBFF03",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "-0.02em",
              }}
            >
              L
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>Léonard</div>
              <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 1 }}>Fondateur de Madger</div>
            </div>
          </div>

          {/* Appel à rejoindre */}
          <motion.a
            href="#early-access"
            className="cta-shine flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex text-black font-semibold text-sm px-7 py-3.5 rounded-full mt-8"
            style={{ background: "#CBFF03" }}
            whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.4)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Rejoindre les premiers coachs
            <span style={{ fontSize: 15 }}>→</span>
          </motion.a>
        </motion.div>

      </div>
    </section>
  );
}
