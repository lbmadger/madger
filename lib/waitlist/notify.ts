import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { waitlistSlotFreedClient } from "@/lib/email/templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Liste d'attente sur créneau (migration 0068) : quand une séance est annulée,
// on prévient par email les personnes qui avaient demandé ce créneau. Chaque
// ligne est réclamée (notified_at) AVANT l'envoi : deux annulations
// concurrentes ne préviennent jamais deux fois. Best-effort : ne lève jamais,
// l'annulation est déjà faite.
export async function notifyWaitlistForBooking(
  admin: SupabaseClient,
  bookingId: string
): Promise<number> {
  try {
    const { data: b } = await admin
      .from("bookings")
      .select("coach_id, starts_at, ends_at, status, coaches(slug, first_name, last_name, timezone)")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b || b.status !== "cancelled") return 0;
    const coach = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
    if (!coach?.slug) return 0;
    if (new Date(b.ends_at as string).getTime() < Date.now()) return 0;

    const { data: claimed } = await admin
      .from("slot_waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("coach_id", b.coach_id)
      .gte("starts_at", b.starts_at)
      .lt("starts_at", b.ends_at)
      .is("notified_at", null)
      .select("email, first_name, starts_at");
    if (!claimed?.length) return 0;

    const coachName =
      [coach.first_name, coach.last_name].filter(Boolean).join(" ") || "ton coach";
    const tz = (coach.timezone as string | null) || "Europe/Paris";
    let sent = 0;
    for (const w of claimed) {
      const iso = w.starts_at as string;
      const dateStr = new Date(iso).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      });
      const tpl = waitlistSlotFreedClient({
        firstName: (w.first_name as string | null) ?? null,
        coachName,
        dateStr,
        bookUrl: `${APP_URL}/${coach.slug}?book=1&slot=${encodeURIComponent(iso)}`,
      });
      if (await sendEmail({ to: w.email as string, subject: tpl.subject, html: tpl.html })) sent++;
    }
    return sent;
  } catch (e) {
    console.error("waitlist notify failed:", e);
    return 0;
  }
}
