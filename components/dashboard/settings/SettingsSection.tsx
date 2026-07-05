"use client";

import { useState, type ReactNode } from "react";

// Section de réglages repliable, façon menu Réglages d'Apple : une rangée
// avec icône, titre, sous-titre et chevron ; le contenu se déplie dessous.
export default function SettingsSection({
  icon,
  title,
  desc,
  defaultOpen = false,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated text-lg"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-base">
            {title}
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
