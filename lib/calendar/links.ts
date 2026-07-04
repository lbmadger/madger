// Lien « Ajouter à Google Calendar » pré-rempli (fonctionne aussi depuis
// mobile, sans OAuth). La visio, elle, passe par Google Meet via le compte
// Google connecté du coach (lib/google/calendar.ts).

const pad = (n: number) => String(n).padStart(2, "0");

// Format Google Calendar : UTC compact YYYYMMDDTHHMMSSZ.
function gcalDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

export function googleCalendarUrl(p: {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: p.title,
    dates: `${gcalDate(p.start)}/${gcalDate(p.end)}`,
  });
  if (p.details) params.set("details", p.details);
  if (p.location) params.set("location", p.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
