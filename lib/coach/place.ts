// Lieu d'une séance en présentiel, tel qu'il est écrit au client (emails,
// espace client, page de réservation, agenda) : la salle du coach (nom et
// adresse) s'il en a une, sinon son lieu habituel en extérieur (migration
// 0072), sinon rien (le coach précise par message).
export function coachPlaceStr(c: {
  gym_name?: string | null;
  gym_address?: string | null;
  outdoor_address?: string | null;
} | null | undefined): string | null {
  if (!c) return null;
  const gym = [c.gym_name, c.gym_address].filter(Boolean).join(" · ");
  if (gym) return gym;
  const outdoor = (c.outdoor_address ?? "").trim();
  return outdoor || null;
}
