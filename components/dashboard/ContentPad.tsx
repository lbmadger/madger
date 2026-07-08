"use client";

import { usePathname } from "next/navigation";

// Réserve la hauteur de la barre d'onglets mobile (pb-20), SAUF dans un fil
// de discussion : la barre y est masquée (MobileNav) et le champ de saisie
// doit coller au bas de l'écran.
export default function ContentPad({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inThread = /^\/dashboard\/messages\/./.test(pathname);
  return (
    <div
      id="main"
      tabIndex={-1}
      className={`flex min-w-0 flex-1 flex-col md:pb-0 ${
        inThread ? "pb-0" : "pb-20"
      }`}
    >
      {children}
    </div>
  );
}
