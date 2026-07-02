// Conversion d'une heure locale (fuseau du coach) vers UTC, sans dépendance.
// Technique classique en deux passes : on suppose l'heure en UTC, on regarde
// ce que ça donne dans le fuseau cible, et on corrige de l'écart constaté.

function tzParts(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p: Record<string, number> = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
}

// "2026-07-03" + "09:30" + "Europe/Paris" → Date UTC correspondante.
export function zonedToUtc(
  dateISO: string,
  time: string,
  timeZone: string
): Date {
  const guess = new Date(`${dateISO}T${time}:00Z`);
  const offset = tzParts(guess, timeZone) - guess.getTime();
  return new Date(guess.getTime() - offset);
}

// Date (UTC) → jour de semaine 0-6 (0 = dimanche) DANS le fuseau donné.
export function weekdayInTz(date: Date, timeZone: string): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(s);
}

// Date (UTC) → "YYYY-MM-DD" dans le fuseau donné.
export function dateISOInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
