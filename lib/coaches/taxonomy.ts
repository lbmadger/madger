// Taxonomie des coachs : sport principal, types d'accompagnement et lieux
// d'exercice. Listes fermées (clés i18n) → filtres fiables côté marketplace.
// Les types d'accompagnement reprennent les objectifs clients (même clés) :
// le filtre client "perte de poids" matche le coach qui coche "perte de poids".

export const SPORT_KEYS = [
  "musculation",
  "fitness",
  "crossfit",
  "boxe",
  "arts_martiaux",
  "yoga",
  "pilates",
  "running",
  "natation",
  "cyclisme",
  "tennis",
  "football",
  "basket",
  "danse",
  "autre",
] as const;
export type SportKey = (typeof SPORT_KEYS)[number];

// Alignées sur GOAL_KEYS (lib/health/bmi.ts) pour le matching client ↔ coach.
export const SPECIALTY_KEYS = [
  "weight_loss",
  "muscle_gain",
  "fitness",
  "endurance",
  "mobility",
  "health_back",
  "competition",
] as const;
export type SpecialtyKey = (typeof SPECIALTY_KEYS)[number];

// Sports où « préparation compétition » a du sens. Pour un sport classique
// (muscu, fitness, yoga, pilates, danse…) on ne propose pas cet objectif :
// il n'a rien à faire là et alourdit le choix.
const COMPETITIVE_SPORTS = new Set<string>([
  "crossfit",
  "boxe",
  "arts_martiaux",
  "running",
  "natation",
  "cyclisme",
  "tennis",
  "football",
  "basket",
]);

// Objectifs proposés à un coach selon son sport : « compétition » seulement
// pour les sports de compétition (ou tant qu'aucun sport n'est choisi, pour ne
// pas masquer l'option d'emblée).
export function specialtiesForSport(
  sport: string | null | undefined
): SpecialtyKey[] {
  if (!sport || COMPETITIVE_SPORTS.has(sport)) return [...SPECIALTY_KEYS];
  return SPECIALTY_KEYS.filter((k) => k !== "competition");
}

// Où se passent les séances — répond au cas « le client est à Basic Fit, le
// coach à Fitness Park » : le coach déclare SES lieux, affichés avant la résa.
export const VENUE_KEYS = [
  "coach_gym", // dans sa salle (gym_name précise laquelle)
  "client_home", // à domicile
  "outdoor", // en extérieur
  "online", // en visio
] as const;
export type VenueKey = (typeof VENUE_KEYS)[number];

// Prestation par défaut proposée selon le sport, à l'onboarding. L'idée n'est
// PAS de deviner juste, mais de ne jamais présenter un formulaire vide : le
// coach voit une offre plausible et l'ajuste, au lieu de la composer de zéro.
// Prix indicatifs du marché français en séance individuelle, en euros.
type DefaultService = { price: number; duration: number };

const DEFAULT_SERVICE: Record<string, DefaultService> = {
  musculation: { price: 50, duration: 60 },
  fitness: { price: 50, duration: 60 },
  crossfit: { price: 55, duration: 60 },
  boxe: { price: 50, duration: 60 },
  arts_martiaux: { price: 50, duration: 60 },
  yoga: { price: 45, duration: 60 },
  pilates: { price: 45, duration: 60 },
  running: { price: 45, duration: 60 },
  natation: { price: 50, duration: 45 },
  cyclisme: { price: 45, duration: 90 },
  tennis: { price: 50, duration: 60 },
  football: { price: 45, duration: 60 },
  basket: { price: 45, duration: 60 },
  danse: { price: 40, duration: 60 },
};

const FALLBACK_SERVICE: DefaultService = { price: 50, duration: 60 };

export function defaultServiceForSport(
  sport: string | null | undefined
): DefaultService {
  return (sport && DEFAULT_SERVICE[sport]) || FALLBACK_SERVICE;
}
