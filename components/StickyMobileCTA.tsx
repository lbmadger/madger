"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StickyMobileCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Tant que la section téléphone est visible (ou pas encore scrollée), on masque
      const phoneSection = document.getElementById("fonctionnement");
      if (!phoneSection) { setShow(false); return; }

      const phoneRect = phoneSection.getBoundingClientRect();
      // phoneRect.bottom > 0 = section encore visible ou en dessous → masquer
      if (phoneRect.bottom > 0) { setShow(false); return; }

      // Masqué quand le formulaire est à l'écran
      const formEl = document.getElementById("early-access");
      if (formEl) {
        const formRect = formEl.getBoundingClientRect();
        if (formRect.top < window.innerHeight && formRect.bottom > 0) { setShow(false); return; }
      }

      setShow(true);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 left-4 right-4 z-50 md:hidden"
        >
          <a
            href="#early-access"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm text-black"
            style={{
              background: "#CBFF03",
              boxShadow: "0 0 30px rgba(203,255,3,0.4), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span>Réserver ma place</span>
            <span style={{ fontSize: 16 }}>→</span>
          </a>
          <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Plan Pro offert 6 mois · Sans engagement
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
