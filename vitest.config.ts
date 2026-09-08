import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests unitaires des fonctions d'argent (remboursements, prorata des packs,
// répartition des versements, plans, numérotation). Pas de DOM, pas de
// réseau : uniquement des fonctions pures sous lib/. `npm test`.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
