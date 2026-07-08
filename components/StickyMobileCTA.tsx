"use client";

import { useEffect, useState } from "react";

export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;

      // Zone utile : seulement après le hero (#after-hero passé au-dessus du
      // viewport) et tant qu'on n'a pas atteint le formulaire d'inscription.
      const sentinel = document.getElementById("after-hero");
      const pastHero = sentinel ? sentinel.getBoundingClientRect().top <= 0 : false;
      const formEl = document.getElementById("early-access");
      const nearForm = formEl ? formEl.getBoundingClientRect().top < window.innerHeight : false;

      if (!pastHero || nearForm) {
        setVisible(false);
        lastY = y;
        return;
      }

      // Direction-aware : le bouton pop quand on DESCEND, reste en place à
      // l'arrêt, et se retire quand on REMONTE (seuil de 2px anti-jitter).
      if (y > lastY + 2) setVisible(true);
      else if (y < lastY - 2) setVisible(false);
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Toujours monté : l'apparition/disparition est une transition CSS pure
  // (translation + opacité), avec entrée ET sortie animées sans framer-motion.
  return (
    <div
      aria-hidden={!visible}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pt-10 pointer-events-none transition-[transform,opacity] duration-300"
      style={{
        transform: visible ? "none" : "translateY(80px)",
        opacity: visible ? 1 : 0,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        // Respecte la zone système (home indicator / encoche basse) sur iPhone & Android.
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        background:
          "linear-gradient(to top, #0A0A0A 0%, #0A0A0A 52%, rgba(10,10,10,0.82) 76%, transparent 100%)",
      }}
    >
      <a
        href="#early-access"
        tabIndex={visible ? undefined : -1}
        className={`${visible ? "pointer-events-auto" : "pointer-events-none"} flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-black`}
        style={{
          background: "#CBFF03",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5), 0 0 18px rgba(203,255,3,0.22)",
        }}
      >
        <span>Réserver ma place</span>
        <span style={{ fontSize: 16 }}>→</span>
      </a>
    </div>
  );
}
