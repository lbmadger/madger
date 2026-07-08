"use client";

import { useState, useRef, useEffect, useId } from "react";
import { searchCities, type City } from "@/lib/geo/cities";

// Champ ville avec autocomplétion des communes françaises. `onChange` suit la
// saisie libre ; `onSelect` est appelé quand l'utilisateur choisit une
// commande (avec ses coordonnées). Sémantique combobox complète : le champ
// annonce la liste (role, aria-expanded, aria-activedescendant) et se pilote
// au clavier (flèches, Entrée, Échap).
export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (city: City) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  // Libellé accessible du champ (déjà traduit par l'appelant).
  ariaLabel?: string;
}) {
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  // Suggestion mise en évidence au clavier (-1 : aucune).
  const [activeIdx, setActiveIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }
    timer.current = setTimeout(async () => {
      const list = await searchCities(v);
      setSuggestions(list);
      setOpen(list.length > 0);
      setActiveIdx(-1);
    }, 250);
  }

  function choose(c: City) {
    onChange(c.name);
    onSelect(c);
    setOpen(false);
    setActiveIdx(-1);
  }

  // Navigation clavier dans la liste de suggestions.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        e.preventDefault();
        choose(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={
          open && activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined
        }
        aria-label={ariaLabel}
        className={inputClassName}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border-strong bg-bg-elevated py-1 shadow-xl"
        >
          {suggestions.map((c, i) => (
            <li
              key={`${c.name}-${c.dept}-${i}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              // onMouseDown (et non onClick) : sélection avant que le blur du
              // champ ne ferme la liste.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left text-sm text-text-base transition-colors hover:bg-bg-card ${
                i === activeIdx ? "bg-bg-card" : ""
              }`}
            >
              <span className="truncate">{c.name}</span>
              {c.dept && (
                <span className="shrink-0 text-xs text-text-dim">
                  {c.dept}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
