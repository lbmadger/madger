"use client";

import { useEffect, useState } from "react";
import { LAUNCH_AT, LAUNCH_LABEL, launchOpened } from "@/lib/launch";

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

  useEffect(() => {
    function tick() {
      const ms = new Date(LAUNCH_AT).getTime() - Date.now();
      if (ms <= 0) {
        setLeft(null);
        return;
      }
      const totalMin = Math.floor(ms / 60000);
      const d = Math.floor(totalMin / 1440);
      const h = Math.floor((totalMin % 1440) / 60);
      const m = totalMin % 60;
      // Au-delà de 24 h : seulement le nombre de jours. Sous 24 h : les heures
      // et minutes. Sous 1 h : les minutes.
      setLeft(d > 0 ? `J-${d}` : h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`);
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  if (launched || launchOpened() || left === null) return null;

  const inner = (
    <>
      <span className="glow-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBFF03]" />
      <span>
        Ouverture publique {LAUNCH_LABEL}
        <span className="text-[#CBFF03]"> · {left}</span>
      </span>
    </>
  );

  if (floating) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-[76px] z-30 -translate-x-1/2 sm:top-[84px]">
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
