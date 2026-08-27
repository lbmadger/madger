import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests unitaires (logique pure : argent/escrow, factures, jetons d'avis).
// Résout l'alias "@/..." comme le fait Next/TypeScript.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
