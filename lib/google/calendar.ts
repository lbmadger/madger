// Intégration Google Calendar + Meet, sans SDK : appels REST directs.
// Chaque coach connecte SON compte Google (OAuth) ; les séances en visio
// créent alors un événement dans son agenda avec un vrai lien Google Meet.
// Nécessite GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (Vercel), issus d'un
// projet Google Cloud avec l'API Calendar activée.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

// Access token éphémère à partir du refresh token stocké pour le coach.
async function accessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

// Crée l'événement (agenda du coach) avec visio Google Meet intégrée.
export async function createMeetEvent(p: {
  refreshToken: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmail?: string | null;
}): Promise<{ eventId: string; meetUrl: string | null } | null> {
  if (!googleConfigured()) return null;
  const token = await accessToken(p.refreshToken);
  if (!token) return null;

  const res = await fetch(`${EVENTS_URL}?conferenceDataVersion=1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: p.summary,
      description: p.description ?? "",
      start: { dateTime: p.start.toISOString() },
      end: { dateTime: p.end.toISOString() },
      ...(p.attendeeEmail
        ? { attendees: [{ email: p.attendeeEmail }] }
        : {}),
      conferenceData: {
        createRequest: {
          requestId: `madger-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
  if (!res.ok) return null;
  const ev = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: { entryPointType?: string; uri?: string }[];
    };
  };
  const meetUrl =
    ev.hangoutLink ??
    ev.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video"
    )?.uri ??
    null;
  return ev.id ? { eventId: ev.id, meetUrl } : null;
}

// Supprime l'événement (annulation de séance). Best-effort.
export async function deleteMeetEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  if (!googleConfigured()) return;
  const token = await accessToken(refreshToken);
  if (!token) return;
  await fetch(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// Crée l'événement Meet pour une séance et enregistre lien + id sur la
// réservation. Best-effort : ne casse jamais le flux appelant.
// `supabase` : client service role. Renvoie l'URL Meet si créée.
export async function attachMeetToBooking(
  supabase: {
    from: (t: string) => {
      // Typage minimal : on n'utilise que select/update chaînés.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [k: string]: any;
    };
  },
  p: {
    bookingId: string;
    coachId: string;
    starts: Date;
    ends: Date;
    coachName?: string;
    clientName?: string;
    clientEmail?: string | null;
  }
): Promise<string | null> {
  try {
    if (!googleConfigured()) return null;
    const { data: coach } = await supabase
      .from("coaches")
      .select("google_refresh_token, first_name, last_name")
      .eq("id", p.coachId)
      .maybeSingle();
    const refreshToken = coach?.google_refresh_token as string | null;
    if (!refreshToken) return null;

    // Titre vu par le client dans son invitation : « Séance avec {coach} ».
    // Le nom du client reste dans la description (pour l'agenda du coach).
    const coachName =
      [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
      p.coachName ||
      "";
    const created = await createMeetEvent({
      refreshToken,
      summary: coachName ? `Séance avec ${coachName}` : "Séance",
      description: [
        p.clientName ? `Client : ${p.clientName}` : null,
        "Réservé via Madger.",
      ]
        .filter(Boolean)
        .join("\n"),
      start: p.starts,
      end: p.ends,
      attendeeEmail: p.clientEmail ?? null,
    });
    if (!created) return null;

    await supabase
      .from("bookings")
      .update({
        meeting_url: created.meetUrl,
        google_event_id: created.eventId,
      })
      .eq("id", p.bookingId);
    return created.meetUrl;
  } catch {
    return null;
  }
}

// Supprime l'événement Google d'une séance annulée. Best-effort.
export async function detachMeetFromBooking(
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (t: string) => { [k: string]: any };
  },
  bookingId: string
): Promise<void> {
  try {
    if (!googleConfigured()) return;
    const { data: b } = await supabase
      .from("bookings")
      .select("google_event_id, coach_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b?.google_event_id) return;
    const { data: coach } = await supabase
      .from("coaches")
      .select("google_refresh_token")
      .eq("id", b.coach_id)
      .maybeSingle();
    if (!coach?.google_refresh_token) return;
    await deleteMeetEvent(
      coach.google_refresh_token as string,
      b.google_event_id as string
    );
  } catch {
    /* best-effort */
  }
}
