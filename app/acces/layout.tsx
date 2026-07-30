import type { Metadata } from "next";

// Page de verrou pré-lancement : jamais indexée (toutes les pages gardées y
// redirigent, Google pourrait sinon l'indexer en « URL seule »).
export const metadata: Metadata = {
  title: "Madger · Accès anticipé",
  robots: { index: false, follow: false },
};

export default function AccesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
