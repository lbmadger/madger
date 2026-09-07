"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

// Liste déroulante maison, aux couleurs Madger. Le <select> natif laisse le
// système dessiner sa liste (gris, hors charte, différent sur chaque OS) :
// ici la liste est un panneau sombre, bordure lime au survol, coche sur le
// choix actif. Comportement calé sur le motif ARIA « select-only combobox » :
// flèches, Entrée, Échap, Début/Fin, recherche par première lettre.
//
// Rendue dans un portail en position fixe : elle passe par-dessus les
// modales à défilement (un panneau overflow-auto rognerait un menu absolu).

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export default function Select({
  value,
  onChange,
  options,
  className,
  listClassName,
  ariaLabel,
  placeholder,
  disabled,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  // Classes du BOUTON (par défaut : style des champs de formulaire).
  className?: string;
  listClassName?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxH: number;
  } | null>(null);
  const typed = useRef<{ s: string; at: number }>({ s: "", at: 0 });

  const selectedIdx = options.findIndex((o) => o.value === value);
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;

  function openList() {
    if (disabled) return;
    setActive(selectedIdx >= 0 ? selectedIdx : firstEnabled(0, 1));
    setOpen(true);
  }
  function closeList(refocus = true) {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }
  function choose(i: number) {
    const o = options[i];
    if (!o || o.disabled) return;
    if (o.value !== value) onChange(o.value);
    closeList();
  }
  function firstEnabled(from: number, dir: 1 | -1): number {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      if (i < 0) i = options.length - 1;
      if (i >= options.length) i = 0;
      if (!options[i]?.disabled) return i;
      i += dir;
    }
    return -1;
  }
  function move(dir: 1 | -1) {
    setActive((a) => {
      const next = firstEnabled(a + dir, dir);
      return next === -1 ? a : next;
    });
  }

  // Position du panneau : sous le bouton, ou au-dessus s'il manque de place.
  useLayoutEffect(() => {
    if (!open) return;
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const gap = 6;
    const below = window.innerHeight - r.bottom - gap - 8;
    const above = r.top - gap - 8;
    const wanted = Math.min(288, options.length * 40 + 8);
    if (below >= wanted || below >= above) {
      setPos({ left: r.left, width: r.width, top: r.bottom + gap, maxH: Math.max(120, below) });
    } else {
      setPos({
        left: r.left,
        width: r.width,
        bottom: window.innerHeight - r.top + gap,
        maxH: Math.max(120, above),
      });
    }
  }, [open, options.length]);

  // Ouvert : focus dans la liste, fermeture au clic dehors / défilement /
  // redimensionnement (le panneau est en position fixe, il ne suit pas).
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // L'option active reste visible quand on navigue au clavier.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function typeahead(key: string) {
    const now = Date.now();
    const s = now - typed.current.at < 700 ? typed.current.s + key : key;
    typed.current = { s: s.toLowerCase(), at: now };
    const start = open ? active + 1 : selectedIdx + 1;
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      const o = options[i];
      if (!o.disabled && o.label.toLowerCase().startsWith(typed.current.s)) {
        if (open) setActive(i);
        else if (o.value !== value) onChange(o.value);
        return;
      }
    }
  }

  function onButtonKey(e: React.KeyboardEvent) {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      typeahead(e.key);
    }
  }

  function onListKey(e: React.KeyboardEvent) {
    // Échap ne doit fermer que la liste, pas la modale qui l'héberge.
    e.stopPropagation();
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeList();
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(firstEnabled(0, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(firstEnabled(options.length - 1, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Tab":
        closeList();
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
    }
  }

  const listId = `${id}-list`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={onButtonKey}
        className={twMerge(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-left text-base text-text-base outline-none transition-colors hover:border-white/20 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-40",
          open && "border-accent",
          className
        )}
      >
        {name && <input type="hidden" name={name} value={value} />}
        <span className={twMerge("truncate", !selected && "text-text-dim")}>
          {selected ? selected.label : placeholder ?? " "}
        </span>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
          className={twMerge(
            "shrink-0 text-text-dim transition-transform duration-200",
            open && "rotate-180 text-accent"
          )}
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            style={{
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxH,
            }}
            className={twMerge(
              "anim-menu-in fixed z-[70] min-w-[10rem] overflow-y-auto rounded-xl border border-accent/30 bg-bg-card p-1 shadow-[0_0_0_1px_rgba(203,255,3,0.12),0_24px_60px_rgba(0,0,0,0.6)] outline-none",
              listClassName
            )}
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isAct = i === active;
              return (
                <li
                  key={`${o.value}-${i}`}
                  id={`${id}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled || undefined}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={twMerge(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isAct ? "bg-accent/10 text-accent" : "text-text-base",
                    isSel && !isAct && "text-accent",
                    o.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="shrink-0 text-accent"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
