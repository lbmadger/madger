"use client";

import { useCallback, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";

// Confirmation stylée (remplace window.confirm) sans provider global : chaque
// composant appelle le hook une fois, rend `dialog`, et fait
// `if (await confirm({...})) { ... }`. Le rendu reste dans le thème sombre,
// au tutoiement, avec focus piégé et Escape (via Dialog partagé).
type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  // Action lourde/irréversible : bouton de confirmation en rouge.
  danger?: boolean;
};

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  const dialog = opts ? (
    <Dialog
      onClose={() => settle(false)}
      label={opts.title}
      className="w-full max-w-sm rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
      <h2 className="text-base font-bold text-text-base">{opts.title}</h2>
      {opts.message && (
        <p className="mt-2 text-sm text-text-muted">{opts.message}</p>
      )}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => settle(false)}
          className="flex-1 rounded-full border border-border-strong py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {opts.cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => settle(true)}
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
            opts.danger
              ? "bg-danger text-white"
              : "bg-accent text-black"
          }`}
        >
          {opts.confirmLabel}
        </button>
      </div>
    </Dialog>
  ) : null;

  return { confirm, dialog };
}
