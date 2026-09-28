// Échappe un texte destiné à un motif LIKE / ILIKE : « % » et « _ » sont des
// jokers, un email qui en contient (ou une adresse forgée « %@domaine.fr »)
// retrouverait les fiches d'autres personnes.
export function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
