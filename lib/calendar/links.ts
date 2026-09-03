// Liens « Ajouter au calendrier » pré-remplis, sans OAuth : Google Calendar
// (URL render) et Apple/Outlook (fichier .ics servi par /api/calendar/ics).
// La visio, elle, passe par Google Meet via le compte Google connecté du
// coach (lib/google/calendar.ts).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

const pad = (n: number) => String(n).padStart(2, "0");

// Format Google Calendar : UTC compact YYYYMMDDTHHMMSSZ.
function gcalDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
};

export function googleCalendarUrl(p: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: p.title,
    dates: `${gcalDate(p.start)}/${gcalDate(p.end)}`,
  });
  if (p.details) params.set("details", p.details);
  if (p.location) params.set("location", p.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Lien vers le .ics : Calendrier Apple (iPhone/Mac) et Outlook n'ouvrent pas
// les URLs Google, mais tout le monde sait ouvrir un fichier .ics. Les données
// voyagent dans l'URL (pas de lecture en base, rien de plus que ce que
// l'email contient déjà).
export function icsUrl(p: CalendarEvent): string {
  const params = new URLSearchParams({
    title: p.title,
    start: p.start.toISOString(),
    end: p.end.toISOString(),
  });
  if (p.details) params.set("details", p.details);
  if (p.location) params.set("location", p.location);
  return `${APP_URL}/api/calendar/ics?${params.toString()}`;
}
