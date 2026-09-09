"use client";

import { useState } from "react";

// Valeur affichée en clair avec un bouton « Copier » : lien visio, lien de
// réservation… Le libellé et sa version « copié » viennent de l'appelant
// (traduits côté serveur).
export default function CopyField({
  value,
  copyLabel,
  copiedLabel,
  className = "",
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible : la valeur reste sélectionnable */
    }
  }
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-border bg-bg-elevated py-1.5 pl-3 pr-1.5 ${className}`}>
      <span className="min-w-0 flex-1 select-all truncate text-xs text-text-muted">{value}</span>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
          copied ? "bg-accent text-black" : "border border-accent/40 text-accent hover:bg-accent/10"
        }`}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
