"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAddresses, type Address } from "@/lib/geo/addresses";

// Champ adresse postale avec autocomplétion (Base Adresse Nationale). La
// saisie reste libre : l'adresse choisie remplace le texte par l'adresse
// complète (numéro, rue, code postal, ville). Même mécanique et même
// sémantique combobox que CityAutocomplete.
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  inputClassName,
  ariaLabel,
  inputRef,
  emptyText = "Aucune adresse trouvée. Vérifie le numéro et la rue, ou garde ce que tu as tapé.",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (a: Address) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  // Pour donner le focus au champ depuis le parent (saisie manuelle de salle).
  inputRef?: React.RefObject<HTMLInputElement>;
  // Message quand rien ne ressemble à la saisie (la saisie libre reste valable).
  emptyText?: string;
}) {
  const [empty, setEmpty] = useState(false);
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Numéro de la dernière recherche : une réponse plus lente arrivée après
  // une frappe plus récente est ignorée (sinon elle écraserait la bonne).
  const reqSeq = useRef(0);
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
    setEmpty(false);
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }
    timer.current = setTimeout(async () => {
      const seq = ++reqSeq.current;
      const list = await searchAddresses(v);
      if (seq !== reqSeq.current) return;
      setSuggestions(list);
      setEmpty(list.length === 0);
      setOpen(true);
      setActiveIdx(-1);
    }, 250);
  }

  function choose(a: Address) {
    onChange(a.label);
    onSelect?.(a);
    setOpen(false);
    setEmpty(false);
    setActiveIdx(-1);
  }

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
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => (suggestions.length > 0 || empty) && setOpen(true)}
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
          className="anim-menu-in absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-accent/30 bg-bg-card p-1 shadow-[0_0_0_1px_rgba(203,255,3,0.12),0_24px_60px_rgba(0,0,0,0.6)]"
        >
          {empty && suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-text-dim">{emptyText}</li>
          )}
          {suggestions.map((a, i) => (
            <li
              key={`${a.label}-${i}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(a);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10 hover:text-accent ${
                i === activeIdx ? "bg-accent/10 text-accent" : "text-text-base"
              }`}
            >
              <span className="block truncate font-medium">{a.street || a.label}</span>
              <span className="block truncate text-xs text-text-dim">
                {a.postcode} {a.city}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
