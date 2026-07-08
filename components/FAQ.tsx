"use client";

import { useId, useState } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import { faqs } from "@/components/faq-data";

function Item({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  // Identifiant unique pour relier le bouton (aria-controls) au panneau.
  const panelId = useId();
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        id={`${panelId}-btn`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-semibold text-white" style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.4 }}>{q}</span>
        <div
          className="transition-transform duration-200 ease-in-out"
          style={{ transform: isOpen ? "rotate(45deg)" : "none", flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: isOpen ? "#CBFF03" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke={isOpen ? "#000" : "#8A8A8A"} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </button>

      {/* Accordéon en CSS pur : transition de grid-template-rows (0fr → 1fr),
          le contenu reste monté et l'animation suit la hauteur réelle. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-btn`}
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          opacity: isOpen ? 1 : 0,
        }}
        aria-hidden={!isOpen}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <p className="pb-5 text-text-muted" style={{ fontSize: 15, lineHeight: 1.75, maxWidth: 680 }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  // Plusieurs questions peuvent rester ouvertes en même temps : ouvrir une
  // question plus bas ne referme plus celle du haut (ce qui faisait "remonter"
  // toute la page). La première est ouverte par défaut.
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="py-20 sm:py-24 relative">
      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        <div className="anim-fade-up text-center flex flex-col items-center mb-12">
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
        </div>

        <div
          className="anim-fade-up"
          style={{
            animationDelay: "0.1s",
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
              isOpen={openSet.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        <p
          className="anim-fade-in text-center mt-8 text-sm"
          style={{ animationDelay: "0.3s", color: "var(--text-dim)" }}
        >
          Une autre question ?{" "}
          <a href="mailto:contact@madger.app" style={{ color: "#CBFF03", textDecoration: "none" }}>
            contact@madger.app
          </a>
        </p>
      </div>
    </section>
  );
}
