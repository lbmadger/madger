// Durées proposées pour une séance, partout où l'on en choisit une
// (onboarding, prestations, agenda, demande libre). 2 h incluses : les
// séances longues (préparation physique, sorties) existent.
export const SERVICE_DURATIONS = [30, 45, 60, 90, 120];

// « 45 min », « 1 h », « 1 h 30 », « 2 h » : lisible dans les deux langues.
export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
