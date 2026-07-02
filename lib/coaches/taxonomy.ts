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

// Où se passent les séances — répond au cas « le client est à Basic Fit, le
// coach à Fitness Park » : le coach déclare SES lieux, affichés avant la résa.
export const VENUE_KEYS = [
  "coach_gym", // dans sa salle (gym_name précise laquelle)
  "client_home", // à domicile
  "outdoor", // en extérieur
  "online", // en visio
] as const;
export type VenueKey = (typeof VENUE_KEYS)[number];
