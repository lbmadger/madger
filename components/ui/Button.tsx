"use client";

import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";
import Spinner from "@/components/ui/Spinner";

// Bouton premium raccord avec la landing : pilule (rounded-full), balayage
// lumineux (.cta-shine défini dans globals.css), léger agrandissement au
// survol, enfoncement à l'appui. Variantes + tailles + état de chargement.
// (Halo rond supprimé à la demande — il gênait au survol.)

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "cta-shine bg-accent px-5 py-3 text-black hover:scale-[1.02] disabled:hover:scale-100",
  secondary:
    "border border-border-strong px-5 py-3 text-text-muted hover:text-text-base hover:border-white/20",
  ghost: "px-3 py-1.5 text-text-muted hover:text-text-base",
  danger:
    "bg-danger px-5 py-3 text-white hover:scale-[1.02] disabled:hover:scale-100",
};

// Tailles optionnelles : si absent, la variante garde son padding par défaut.
// Fournie, elle prime (twMerge dédoublonne px/py).
const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export default function Button({
  variant = "primary",
  size,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      // Un bouton en chargement est inactif (évite le double-clic) et signalé
      // aux technologies d'assistance.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={twMerge(
        "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:active:scale-100",
        VARIANTS[variant],
        size && SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
