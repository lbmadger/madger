"use client";

import { motion } from "framer-motion";

// Transition d'entrée de page : fondu en opacité UNIQUEMENT. On évite
// volontairement transform/filter sur ce conteneur car ils créeraient un
// bloc englobant qui casserait le position:fixed (fond animé) et le sticky
// (hero). L'opacité, elle, est sans effet de bord sur le positionnement.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
