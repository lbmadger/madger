"use client";

import { useState } from "react";

// Petit bouton « i » : une bulle d'explication au clic (mobile friendly,
// pas de survol requis). Se referme au blur ou au second clic.
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Explication"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong text-[9px] font-bold leading-none text-text-dim transition-colors hover:border-accent hover:text-accent"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-5 z-30 w-60 -translate-x-1/2 rounded-xl border border-border bg-bg-elevated p-3 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-text-muted shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
