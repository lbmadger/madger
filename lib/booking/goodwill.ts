// Geste commercial du coach sur une séance annulée : il rend au client ce
// qu'il a touché (le net après frais Madger ; les frais restent acquis à
// Madger), pendant 7 jours après la date de la séance.
export const GOODWILL_DAYS = 7;

export function goodwillDeadline(startsAt: string | Date): Date {
  return new Date(new Date(startsAt).getTime() + GOODWILL_DAYS * 86400000);
}

export function goodwillOpen(startsAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() <= goodwillDeadline(startsAt).getTime();
}
