// Transition d'entrée de page : fondu en opacité UNIQUEMENT, en CSS pur
// (classe .page-fade dans globals.css). L'ancienne version passait par
// framer-motion, ce qui embarquait la librairie (~45 KB gz) dans le First
// Load JS de TOUTES les routes, y compris celles qui n'animent rien.
// On évite volontairement transform/filter sur ce conteneur : ils créeraient
// un bloc englobant qui casserait position:fixed (fond animé) et sticky
// (hero). L'opacité est sans effet de bord sur le positionnement.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
