"use client";

import { useEffect, useRef, useState } from "react";

// Curseur premium : un anneau lime qui suit le pointeur avec une légère
// inertie et grossit au survol des éléments interactifs. Additif (le curseur
// natif reste visible pour ne rien casser côté accessibilité). Activé
// uniquement souris fine + hors reduced-motion → invisible sur mobile.
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }
      const t = e.target as HTMLElement | null;
      targetScale = t && t.closest("a, button, [role='button'], input, select, textarea, label")
        ? 1.9
        : 1;
    };
    const onLeave = () => {
      visible = false;
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;
      scale += (targetScale - scale) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ringX}px, ${ringY}px) translate(-50%, -50%) scale(${scale})`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div
      ref={ringRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "1.5px solid rgba(203,255,3,0.65)",
        boxShadow: "0 0 12px rgba(203,255,3,0.25)",
        pointerEvents: "none",
        zIndex: 10000,
        opacity: 0,
        transition: "opacity 0.3s ease",
        willChange: "transform",
        mixBlendMode: "screen",
      }}
    />
  );
}
