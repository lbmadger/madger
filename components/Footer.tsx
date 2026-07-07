"use client";

import Link from "next/link";
import MadgerLogo from "@/components/ui/MadgerLogo";

export default function Footer() {
  return (
    <footer
      className="py-16"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {/* Top row: logo + nav links + copyright */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-5 sm:gap-6 text-center sm:text-left">
          <a href="/" className="flex items-center flex-shrink-0">
            <MadgerLogo size={36} />
          </a>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="#fonctionnement" className="text-text-muted hover:text-white transition-colors duration-200">Fonctionnement</a>
            <a href="#dashboard" className="text-text-muted hover:text-white transition-colors duration-200">Dashboard</a>
            <a href="#tarifs" className="text-text-muted hover:text-white transition-colors duration-200">Tarifs</a>
            <a href="#early-access" className="text-text-muted hover:text-white transition-colors duration-200">Accès anticipé</a>
            <a href="mailto:contact@madger.app" className="text-text-muted hover:text-white transition-colors duration-200">Contact</a>
          </div>

          <div className="text-text-dim text-sm">© 2026 Madger</div>
        </div>

        {/* Bottom row: legal links */}
        <div
          className="flex flex-wrap justify-center sm:justify-start gap-5 mt-8 pt-6 text-xs"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)", color: "#757575" }}
        >
          <Link href="/mentions-legales" className="hover:text-white transition-colors duration-200">Mentions légales</Link>
          <Link href="/politique-de-confidentialite" className="hover:text-white transition-colors duration-200">Politique de confidentialité</Link>
          <Link href="/cgu" className="hover:text-white transition-colors duration-200">CGU</Link>
          <Link href="/cgv" className="hover:text-white transition-colors duration-200">CGV</Link>
          <Link href="/politique-cookies" className="hover:text-white transition-colors duration-200">Cookies</Link>
          <span>Paiements sécurisés via Stripe</span>
        </div>
      </div>
    </footer>
  );
}