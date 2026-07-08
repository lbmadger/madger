"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type GymPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

// Autocomplétion de VRAIES salles de sport (via /api/gyms, OpenStreetMap).
// Le coach tape le nom, choisit sa salle dans la liste : la salle validée
// (avec adresse et coordonnées) est renvoyée via onSelect. Sémantique
// combobox complète (clavier + lecteur d'écran), même patron que
// CityAutocomplete.
export default function GymAutocomplete({
  value,
  selectedAddress,
  onChange,
  onSelect,
  inputClassName = "",
}: {
  value: string;
  // Adresse de la salle validée (affichée sous le champ), null si non validée.
  selectedAddress?: string | null;
  // Saisie libre : le nom change, la validation saute (onSelect(null)).
  onChange: (v: string) => void;
  onSelect: (gym: GymPlace | null) => void;
  inputClassName?: string;
}) {
  const { t } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fermeture au clic extérieur.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function search(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 3) {
        setGyms([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/gyms?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({ gyms: [] }));
        setGyms(Array.isArray(data.gyms) ? data.gyms : []);
        setOpen(true);
        setActive(-1);
      } catch {
        setGyms([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(g: GymPlace) {
    onChange(g.name);
    onSelect(g);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 ? `${listId}-opt-${active}` : undefined
        }
        aria-label={t("settings.gymLabel")}
        placeholder={t("settings.gymSearchPlaceholder")}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelect(null);
          search(e.target.value);
        }}
        onKeyDown={(e) => {
          if (!open || gyms.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % gyms.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? gyms.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(gyms[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
      />
      {selectedAddress && (
        <p className="mt-1 flex items-center gap-1 text-xs text-accent">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="truncate text-text-muted">
            {t("settings.gymVerified")} · {selectedAddress}
          </span>
        </p>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("settings.gymLabel")}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border-strong bg-bg-elevated py-1 shadow-xl"
        >
          {loading && gyms.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-dim">…</li>
          ) : gyms.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-dim">
              {t("settings.gymNoResult")}
            </li>
          ) : (
            gyms.map((g, i) => (
              <li
                key={g.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onClick={() => pick(g)}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === active
                      ? "bg-accent/10 text-text-base"
                      : "text-text-muted hover:bg-white/[0.04] hover:text-text-base"
                  }`}
                >
                  <span className="block font-medium text-text-base">
                    {g.name}
                  </span>
                  {g.address && (
                    <span className="block truncate text-xs text-text-dim">
                      {g.address}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
