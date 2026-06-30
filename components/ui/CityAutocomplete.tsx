"use client";

import { useState, useRef, useEffect } from "react";
import { searchCities, type City } from "@/lib/geo/cities";

// Champ ville avec autocomplétion des communes françaises. `onChange` suit la
// saisie libre ; `onSelect` est appelé quand l'utilisateur choisit une
// commande (avec ses coordonnées).
export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (city: City) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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
      return;
    }
    timer.current = setTimeout(async () => {
      const list = await searchCities(v);
      setSuggestions(list);
      setOpen(list.length > 0);
    }, 250);
  }

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border-strong bg-bg-elevated py-1 shadow-xl">
          {suggestions.map((c, i) => (
            <li key={`${c.name}-${c.dept}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.name);
                  onSelect(c);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-text-base transition-colors hover:bg-bg-card"
              >
                <span className="truncate">{c.name}</span>
                {c.dept && (
                  <span className="shrink-0 text-xs text-text-dim">
                    {c.dept}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
