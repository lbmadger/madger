"use client";

import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

// Bouton premium raccord avec la landing : pilule (rounded-full), balayage
// lumineux (.cta-shine défini dans globals.css), léger agrandissement au
// survol, enfoncement à l'appui. Trois variantes. (Halo rond supprimé à la
// demande — il gênait au survol.)

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "cta-shine bg-accent px-5 py-3 text-black hover:scale-[1.02] disabled:hover:scale-100",
  secondary:
    "border border-border-strong px-5 py-3 text-text-muted hover:text-text-base hover:border-white/20",
  ghost: "px-3 py-1.5 text-text-muted hover:text-text-base",
};

export default function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={twMerge(
        "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:active:scale-100",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
