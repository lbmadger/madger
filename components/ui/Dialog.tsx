"use client";

import { useEffect, useRef } from "react";

// Coquille de modale accessible, partagée par toutes les modales du produit :
// - role="dialog" + aria-modal + aria-label (lecteurs d'écran)
// - focus posé sur le premier élément interactif à l'ouverture
// - Tab/Shift-Tab piégés à l'intérieur, Escape referme
// - focus rendu à l'élément déclencheur à la fermeture
// - clic sur le fond = fermeture, clic dans le panneau = inerte
export default function Dialog({
  onClose,
  label,
  className,
  children,
}: {
  onClose: () => void;
  // Intitulé annoncé par les lecteurs d'écran (titre de la modale).
  label: string;
  // Classes du PANNEAU (le fond sombre est géré ici).
  className?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusables = (): HTMLElement[] =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1)
      : [];

    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const idx = els.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        els[els.length - 1].focus();
      } else if (!e.shiftKey && idx === els.length - 1) {
        e.preventDefault();
        els[0].focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
