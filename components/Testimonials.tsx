"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    photo: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=80&h=80&fit=crop&auto=format&q=80",
    name: "Camille R.",
    role: "Coach fitness · Lyon",
    stars: 5,
    badge: "Bêta testeur",
    text: "Ma première semaine, j'ai récupéré presque 4h que je passais sur WhatsApp à caler des créneaux et relancer des paiements. Maintenant tout arrive automatiquement - réservation, paiement, facture.",
  },
  {
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format&q=80",
    name: "Thomas G.",
    role: "Préparateur physique · Paris",
    stars: 5,
    badge: "Bêta testeur",
    text: "J'avais des impayés qui traînaient depuis des semaines. Depuis que le paiement se fait à la réservation, ce problème n'existe plus. C'est aussi simple que ça.",
  },
  {
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format&q=80",
    name: "Sarah M.",
    role: "Coach bien-être · Bordeaux",
    stars: 5,
    badge: "Accès anticipé",
    text: "J'ai mis mon lien Madger dans ma bio Instagram un vendredi soir. Le lundi, j'avais 2 nouvelles réservations avec paiement confirmé. Sans avoir rien fait.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#CBFF03">
          <path d="M7 1l1.5 4H13l-3.5 2.5 1.3 4.2L7 9.3l-3.8 2.4L4.5 7.5 1 5h4.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(203,255,3,0.03), transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center flex flex-col items-center mb-12"
        >
          <h2
            className="font-extrabold text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Ce que disent les premiers<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>coachs à l'utiliser.</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col p-6 rounded-3xl"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.07)",
                position: "relative",
              }}
            >
              {/* Stars + badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Stars count={t.stars} />
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <circle cx="4.5" cy="4.5" r="4.5" fill="rgba(203,255,3,0.15)" />
                    <path d="M2.5 4.5l1.3 1.4 2.2-2.8" stroke="#CBFF03" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{t.badge}</span>
                </div>
              </div>

              {/* Quote */}
              <p className="flex-1" style={{ fontSize: 14, color: "#C0C0C0", lineHeight: 1.72, marginBottom: 20 }}>
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  flexShrink: 0,
                  overflow: "hidden",
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.4), 0 0 0 3px rgba(203,255,3,0.2)",
                }}>
                  <img src={t.photo} alt={t.name} loading="lazy" decoding="async" width={38} height={38} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#8A8A8A", marginTop: 1 }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
