// Liens calendrier et visio, sans aucune intégration OAuth : un lien
// Google Calendar pré-rempli (fonctionne aussi depuis mobile) et une salle de
// visio dédiée par séance (Jitsi Meet, gratuit, sans compte).

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

// Salle de visio dédiée à une séance (URL non devinable : id de réservation).
export function meetingUrlFor(bookingId: string): string {
  return `https://meet.jit.si/Madger-${bookingId}`;
}
