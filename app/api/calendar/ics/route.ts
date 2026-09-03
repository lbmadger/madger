import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fichier .ics « Ajouter au calendrier » pour les emails de confirmation de
// séance : Calendrier Apple (iPhone/Mac), Outlook et les autres clients
// l'ouvrent nativement, là où le lien Google Calendar ne parle qu'à Google.
// Auto-portant : tout vient de l'URL (générée par icsUrl côté serveur au
// moment de l'envoi), aucune lecture en base, donc rien à protéger de plus
// que le contenu de l'email lui-même.

// Échappement des champs texte ICS (RFC 5545).
const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Date ICS en UTC compact : YYYYMMDDTHHMMSSZ.
const icsDate = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const clip = (v: string | null) => (v ?? "").slice(0, 600).trim();

  const title = clip(q.get("title")) || "Séance de coaching";
  const start = new Date(q.get("start") ?? "");
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "invalid start" }, { status: 400 });
  }
  const endRaw = new Date(q.get("end") ?? "");
  const end =
    Number.isNaN(endRaw.getTime()) || endRaw <= start
      ? new Date(start.getTime() + 60 * 60000)
      : endRaw;
  const details = clip(q.get("details"));
  const location = clip(q.get("location"));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Madger//Booking//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${start.getTime()}-${encodeURIComponent(title).slice(0, 40)}@madger.app`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(title)}`,
    ...(details ? [`DESCRIPTION:${esc(details)}`] : []),
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seance-madger.ics"',
      "Cache-Control": "no-store",
    },
  });
}
