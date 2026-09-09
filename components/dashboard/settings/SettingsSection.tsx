"use client";

import { useEffect, useState, type ReactNode } from "react";

// Section de réglages repliable, façon menu Réglages d'Apple : une rangée
// avec icône, titre, sous-titre et chevron ; le contenu se déplie dessous.
// Avec un `id`, la section s'ouvre et se cadre toute seule quand l'URL
// porte l'ancre correspondante (ex. /dashboard/reglages#objectif).
export default function SettingsSection({
  id,
  icon,
  title,
  desc,
  todo,
  defaultOpen = false,
  children,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  desc?: string;
  // Libellé du badge « À remplir » quand la section manque d'une donnée
  // importante (photo, bio, sport, salle, SIRET, diplôme…).
  todo?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!id || window.location.hash !== `#${id}`) return;
    setOpen(true);
    const timer = setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(timer);
  }, [id]);

  return (
    <section
      id={id}
      // Pas d'overflow-hidden : les listes déroulantes (ville, salle) qui
      // s'ouvrent sous un champ doivent pouvoir dépasser du cadre.
      className="scroll-mt-24 rounded-2xl border border-border bg-bg-card"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-5 ${
          open ? "rounded-t-2xl" : "rounded-2xl"
        }`}
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated text-accent"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-text-base">
            <span className="truncate">{title}</span>
            {todo && (
              <span className="shrink-0 rounded-full border border-warning/40 bg-warning/[0.08] px-2 py-0.5 text-[10px] font-semibold text-warning">
                {todo}
              </span>
            )}
          </span>
          {desc && (
            <span className="mt-0.5 block truncate text-xs text-text-muted">
              {desc}
            </span>
          )}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-text-dim transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-5 pt-4 sm:px-5">
          {children}
        </div>
      )}
    </section>
  );
}
