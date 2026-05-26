"use client";

import { motion } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";

export default function Footer() {
  return (
    <footer
      className="py-16"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-5 sm:gap-6 text-center sm:text-left">
          <a href="#" className="flex items-center">
            <img src="/logo.png" alt="Madger" style={{ height: 20, width: "auto", objectFit: "contain", display: "block" }} />
          </a>

          <div className="flex flex-wrap gap-7 text-sm">
            <a href="#fonctionnement" className="text-text-muted hover:text-white transition-colors duration-200">Fonctionnement</a>
            <a href="#dashboard" className="text-text-muted hover:text-white transition-colors duration-200">Dashboard</a>
<a href="#tarifs" className="text-text-muted hover:text-white transition-colors duration-200">Tarifs</a>
            <a href="#early-access" className="text-text-muted hover:text-white transition-colors duration-200">Early access</a>
            <a href="mailto:bonjour@madger.app" className="text-text-muted hover:text-white transition-colors duration-200">Contact</a>
          </div>

          <div className="text-text-dim text-sm">© 2026 Madger</div>
        </div>


      </div>
    </footer>
  );
}