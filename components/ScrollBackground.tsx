"use client";

import { useEffect, useState } from "react";

export default function ScrollBackground() {
  const [p, setP] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEnabled(false);
      return;
    }
    const fn = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // `transform` plutôt que `top` : animé sur le compositeur, pas de reflow à
  // chaque frame de scroll. Déplacement exprimé en vh (le conteneur fixed
  // fait 100vh de haut, équivalent aux anciens % de `top`).
  const orb = (translate: number): React.CSSProperties => ({
    transform: `translateY(${enabled ? translate : 0}vh)`,
    transition: "transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
    willChange: "transform",
  });

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        mixBlendMode: "screen",
        overflow: "hidden",
      }}
    >
      {/* Orbe principal - descend avec le scroll */}
      <div
        style={{
          position: "absolute",
          width: "75vw",
          height: "75vw",
          maxWidth: 960,
          maxHeight: 960,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.13) 0%, transparent 62%)",
          left: "-18%",
          top: "-15%",
          filter: "blur(72px)",
          ...orb(p * 60),
        }}
      />
      {/* Orbe secondaire - remonte avec le scroll */}
      <div
        style={{
          position: "absolute",
          width: "55vw",
          height: "55vw",
          maxWidth: 720,
          maxHeight: 720,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.08) 0%, transparent 62%)",
          right: "-12%",
          top: "65%",
          filter: "blur(96px)",
          ...orb(p * -55),
        }}
      />
      {/* Micro orbe accent - mid-page */}
      <div
        style={{
          position: "absolute",
          width: "30vw",
          height: "30vw",
          maxWidth: 400,
          maxHeight: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.06) 0%, transparent 62%)",
          left: "35%",
          top: "20%",
          filter: "blur(60px)",
          ...orb(p * 40),
        }}
      />
    </div>
  );
}
