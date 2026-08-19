"use client";

import MagneticButton from "@/components/ui/MagneticButton";

// Section finale de la landing APRÈS le lancement (SITE_LAUNCHED=1) : elle
// remplace le formulaire d'accès anticipé. Même id "early-access" pour que
// les ancres résiduelles et la logique du CTA mobile collant continuent de
// fonctionner sans rien changer ailleurs.
export default function LaunchCTA() {
  return (
    <section id="early-access" className="relative overflow-hidden py-24 sm:py-32">
      {/* Halo d'accent, même langage visuel que le hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(203,255,3,0.09), transparent 70%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-5 sm:px-6 text-center">
        <h2
          className="anim-fade-up font-extrabold text-white mb-5"
          style={{ fontSize: "clamp(30px, 5vw, 56px)", letterSpacing: "-0.035em", lineHeight: 1.05 }}
        >
          Ton lien est prêt.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Il n&apos;attend que toi.
          </span>
        </h2>
        <p
          className="anim-fade-up text-text-muted max-w-xl mx-auto mb-8"
          style={{ animationDelay: "0.08s", fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.6 }}
        >
          Crée ton compte, configure ta page en quelques minutes et partage ton
          lien. Tes clients réservent seuls, Madger gère le reste.
        </p>
        <div className="anim-fade-up" style={{ animationDelay: "0.16s" }}>
          <MagneticButton className="inline-block" strength={0.45}>
            <a
              href="/signup"
              className="cta-shine inline-flex items-center justify-center font-semibold text-sm px-9 py-4 rounded-full transition-[transform,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(203,255,3,0.5)] active:scale-[0.97]"
              style={{ background: "#CBFF03", color: "#000" }}
            >
              Créer mon compte gratuitement →
            </a>
          </MagneticButton>
        </div>
        <p
          className="anim-fade-in mt-5 text-sm"
          style={{ animationDelay: "0.28s", color: "var(--text-dim)" }}
        >
          Gratuit pour commencer · 14 jours de Pro offerts · Sans engagement
        </p>
      </div>
    </section>
  );
}
