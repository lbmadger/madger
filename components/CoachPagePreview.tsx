"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

// Section landing : aperçu de la PAGE PUBLIQUE d'un coach (côté client), en
// complément du mockup dashboard (côté coach). Rend concret le « un lien à
// partager » et renvoie vers la vraie page vitrine /exemple.

const SERVICES = [
  { name: "Séance individuelle", meta: "1h · en salle", price: "45 €" },
  { name: "Pack 10 séances", meta: "39 € / séance", price: "390 €" },
  { name: "Suivi mensuel", meta: "programme + messages", price: "120 € / mois" },
];

export default function CoachPagePreview() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(203,255,3,0.05), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <SectionLabel>Ta page publique</SectionLabel>
          <h2
            className="mb-4 font-extrabold text-white"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Un seul lien à partager.<br />
            <span
              style={{
                background: "linear-gradient(90deg, #CBFF03, #a8e600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tes clients réservent tout seuls.
            </span>
          </h2>
          <p className="max-w-lg text-lg text-text-muted" style={{ lineHeight: 1.6 }}>
            Ta page pro, prête en 10 minutes : prestations, tarifs, avis et
            réservation avec paiement en ligne. Tu la partages, c'est tout.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-md"
        >
          {/* Cadre navigateur */}
          <div
            className="overflow-hidden rounded-2xl border border-white/10"
            style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(203,255,3,0.05)" }}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#1A1A1A] px-3.5 py-2.5">
              <div className="flex gap-1.5">
                {["#FF5F57", "#FFBD2E", "#28C840"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="mx-auto flex max-w-[220px] items-center gap-1.5 rounded-md bg-[#111] px-2.5 py-1">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#757575" strokeWidth="2" /></svg>
                <span className="text-[10px] text-text-dim">madger.app/emma-laurent</span>
              </div>
            </div>

            {/* Contenu page coach */}
            <div className="bg-[#0D0D0D] p-5">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=200&q=80"
                  alt="Emma Laurent, coach"
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover"
                />
                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-lg font-extrabold tracking-tight text-white">Emma Laurent</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                      Vérifié
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">Coach musculation & remise en forme</p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs">
                    <span className="text-accent">★★★★★</span>
                    <span className="text-text-dim">4,9 (27) · Lyon</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {SERVICES.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{s.name}</p>
                      <p className="text-[11px] text-text-dim">{s.meta}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-accent">{s.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-full bg-accent py-2.5 text-center text-sm font-bold text-black">
                Réserver une séance
              </div>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-text-dim">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Paiement sécurisé, versé au coach après la séance
              </p>
            </div>
          </div>

          {/* CTA vers la vraie page vitrine */}
          <div className="mt-8 text-center">
            <Link
              href="/exemple"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-accent hover:text-accent"
            >
              Voir une vraie page coach
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
