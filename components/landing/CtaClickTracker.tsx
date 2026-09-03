"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/posthog";

// Traqueur délégué des CTA de la landing : un seul écouteur au niveau du
// document capte tous les clics vers /signup ou #early-access, d'où qu'ils
// viennent (navbar, hero, comparatif, pricing, sticky, fondateur, footer).
// L'événement porte la section d'origine : on saura enfin QUEL bouton
// produit les inscriptions, et lesquels ne servent à rien.
export default function CtaClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href !== "/signup" && href !== "#early-access") return;
      // Section porteuse : l'ancêtre le plus proche avec un id, sinon la
      // balise section, sinon "page".
      const section =
        a.closest<HTMLElement>("[id]")?.id ||
        a.closest("section")?.className.split(" ")[0] ||
        "page";
      track("cta_click", {
        href,
        section,
        label: (a.textContent || "").trim().slice(0, 60),
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
