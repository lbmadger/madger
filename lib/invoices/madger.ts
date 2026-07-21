// Identité légale de Madger, telle qu'affichée sur les factures de commission
// (Madger → coach) et dans les mentions légales. Une seule source de vérité.
export const MADGER_LEGAL = {
  brand: "MADGER",
  name: "Léonard Bondeau",
  siret: "933 449 365 00016",
  address: "Résidence du Bois de Sapin, 71400 Autun",
  email: "contact@madger.app",
  site: "madger.app",
  // Franchise en base de TVA (art. 293 B du CGI).
  vatExempt: true,
} as const;
