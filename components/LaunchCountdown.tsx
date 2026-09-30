"use client";

import { useEffect, useState } from "react";
import { LAUNCH_AT, LAUNCH_LABEL, launchOpened } from "@/lib/launch";

// Nombre de jours civils (heure de Paris) entre aujourd'hui et une date.
function calendarDaysUntil(target: Date, now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const toUtcDay = (d: Date) => {
    const [y, mo, da] = fmt.format(d).split("-").map(Number);
    return Date.UTC(y, mo - 1, da);
  };
  return Math.round((toUtcDay(target) - toUtcDay(now)) / 86400000);
}

// Compte à rebours de l'ouverture publique. Disparaît dès l'heure passée
// (le site s'ouvre à la même minute) ou si le site est déjà ouvert.
// `floating` : pastille fixée sous la barre de navigation de la landing ;
// sinon, bloc en ligne (page du code d'accès).
export default function LaunchCountdown({
  launched = false,
  floating = false,
}: {
  launched?: boolean;
  floating?: boolean;
}) {
  const [left, setLeft] = useState<string | null>(null);
  // Pastille flottante visible sur le hero seulement : passé le repère
  // #after-hero, elle s'efface au lieu de flotter par-dessus le reste.
  const [onHero, setOnHero] = useState(true);
  useEffect(() => {
    if (!floating) return;
    const onScroll = () => {
      const sentinel = document.getElementById("after-hero");
      setOnHero(sentinel ? sentinel.getBoundingClientRect().top > 120 : window.scrollY < 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [floating]);

  useEffect(() => {
    function tick() {
      const ms = new Date(LAUNCH_AT).getTime() - Date.now();
      if (ms <= 0) {
        setLeft(null);
        return;
      }
      const totalMin = Math.floor(ms / 60000);
      const h = Math.floor((totalMin % 1440) / 60);
      const m = totalMin % 60;
      // Jours en CALENDRIER de Paris, pas en tranches de 24 h : le 29 au
      // soir, l'ouverture du 4 est « J-5 » pour tout le monde, même s'il
      // reste moins de 5 fois 24 h.
      const d = calendarDaysUntil(new Date(LAUNCH_AT));
      // À plus d'un jour : seulement le nombre de jours. Sous 24 h : les
      // heures et minutes. Sous 1 h : les minutes.
      setLeft(totalMin >= 1440 ? `J-${d}` : h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`);
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  if (launched || launchOpened() || left === null) return null;

  const inner = (
    <>
      <span className="glow-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBFF03]" />
      <span className="whitespace-nowrap">
        {/* Écran étroit (navigateur intégré d'Instagram) : libellé court,
            une seule ligne, jamais de pastille qui s'étale sur le hero. */}
        <span className="sm:hidden">Ouverture dim. 4 oct. 18h</span>
        <span className="hidden sm:inline">Ouverture publique {LAUNCH_LABEL}</span>
        <span className="text-[#CBFF03]"> · {left}</span>
      </span>
    </>
  );

  if (floating) {
    return (
      <div
        className="pointer-events-none fixed left-1/2 top-[76px] z-30 -translate-x-1/2 transition-opacity duration-300 sm:top-[84px]"
        style={{ opacity: onHero ? 1 : 0 }}
      >
        <p className="anim-fade-up inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#CBFF03]/30 bg-[#0A0A0A]/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur">
          {inner}
        </p>
      </div>
    );
  }
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#CBFF03]/30 bg-[#CBFF03]/10 px-3.5 py-1.5 text-xs font-semibold text-white">
      {inner}
    </p>
  );
}
