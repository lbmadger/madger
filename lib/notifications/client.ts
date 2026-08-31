import type { SupabaseClient } from "@supabase/supabase-js";

// Notification in-app pour le client (cloche de l'espace client). Toujours
// best-effort : appelée depuis les routes qui envoient déjà l'email, elle ne
// doit jamais faire échouer l'opération principale. Défensif si la migration
// 0054 n'est pas encore passée (l'insert échoue en silence).
export type ClientNotifType =
  | "cancelled"
  | "declined"
  | "rescheduled"
  | "accepted";

export async function notifyClient(
  admin: SupabaseClient,
  p: {
    email: string;
    type: ClientNotifType;
    coachName?: string | null;
    startsAt?: string | null;
    bookingId?: string | null;
  }
): Promise<void> {
  try {
    await admin.from("client_notifications").insert({
      email: p.email.trim().toLowerCase(),
      type: p.type,
      coach_name: p.coachName ?? null,
      starts_at: p.startsAt ?? null,
      booking_id: p.bookingId ?? null,
    });
  } catch {
    /* best-effort */
  }
}
