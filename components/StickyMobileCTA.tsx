"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const [nearForm, setNearForm] = useState(false);
  const [inScrollSection, setInScrollSection] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const formEl = document.getElementById("early-access");
    if (!formEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNearForm(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(formEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = document.getElementById("fonctionnement");
    if (!scrollEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInScrollSection(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && !nearForm && !inScrollSection && (
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
