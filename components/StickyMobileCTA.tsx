"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StickyMobileCTA() {
  const [pastHero, setPastHero] = useState(false);
  const [nearForm, setNearForm] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Visible seulement quand le sentinel #after-hero est PASSÉ au-dessus du viewport
      const sentinel = document.getElementById("after-hero");
      if (!sentinel) { setPastHero(false); return; }
      setPastHero(sentinel.getBoundingClientRect().top <= 0);

      // Masqué quand le formulaire est visible
      const formEl = document.getElementById("early-access");
      if (formEl) {
        const r = formEl.getBoundingClientRect();
        // Hide once the form's top edge has entered or passed the viewport —
        // covers both "form is visible" and "user has scrolled past the form"
        setNearForm(r.top < window.innerHeight);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {pastHero && !nearForm && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pt-10 pb-4 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #0A0A0A 0%, #0A0A0A 52%, rgba(10,10,10,0.82) 76%, transparent 100%)",
          }}
        >
          <a
            href="#early-access"
            className="pointer-events-auto flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-black"
            style={{
              background: "#CBFF03",
              boxShadow: "0 6px 20px rgba(0,0,0,0.5), 0 0 18px rgba(203,255,3,0.22)",
            }}
          >
            <span>Réserver ma place</span>
            <span style={{ fontSize: 16 }}>→</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
