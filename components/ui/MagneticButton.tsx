"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

// Effet magnétique premium : l'enfant glisse légèrement vers le curseur puis
// revient en douceur quand la souris quitte la zone. Souris uniquement —
// neutralisé au tactile et quand l'utilisateur demande moins d'animations.
// Le wrapper ne porte QUE la translation : l'élément intérieur garde ses
// propres effets (scale au hover/tap), aucun conflit de transform.
export default function MagneticButton({
  children,
  strength = 0.4,
  className,
  style,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
  };

  const handleMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  return (
    <span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={className}
      style={{
        display: "inline-block",
        transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
