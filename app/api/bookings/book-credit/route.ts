import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { notifyClient } from "@/lib/notifications/client";
import {
  packSessionBookedClient,
  packSessionBookedCoach,
} from "@/lib/email/templates";
import { attachMeetToBooking } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
const MAX_SLOTS = 5;

// Le CLIENT place une ou plusieurs séances sur ses crédits de pack, depuis
// son espace. Couple client / coach strict : les crédits ne valent que chez
// le coach qui a vendu le pack. Chaque séance consomme un crédit de façon
// atomique (fonction SQL, pack qui expire le plus tôt d'abord). En mode
// approbation, la séance est « à confirmer » par le coach, comme une
// réservation classique ; en instantané, elle est confirmée tout de suite.
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const coachId = body.coach_id as string | undefined;
  const rawSlots = Array.isArray(body.slots) ? (body.slots as unknown[]) : [];
  const slots = Array.from(
    new Set(
      rawSlots
        .map((s) => new Date(String(s)))
        .filter((d) => !Number.isNaN(d.getTime()))
        .map((d) => d.toISOString())
    )
  ).slice(0, MAX_SLOTS);
  if (!coachId || slots.length === 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);

  const { data: coach } = await admin
    .from("coaches")
    .select(
      "id, slug, first_name, last_name, booking_mode, min_notice_hours, timezone, locale, gym_name, gym_address"
    )
    .eq("id", coachId)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "coach_not_found" }, { status: 404 });
  }

  // Fiche client de CE coach rattachée au compte connecté (par email).
  const { data: clientRow } = await admin
    .from("clients")
    .select("id, first_name, last_name, email")
    .eq("coach_id", coachId)
    .ilike("email", user.email.trim().toLowerCase())
    .limit(1)
    .maybeSingle();
  if (!clientRow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Crédits disponibles chez ce coach (packs actifs, non expirés).
  const nowIso = new Date().toISOString();
  const { data: packs } = await admin
    .from("pack_credits")
    .select("id, total, used, expires_at, service_id, services(duration_min, location)")
    .eq("coach_id", coachId)
    .eq("client_id", clientRow.id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("expires_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const available = (packs ?? []).reduce(
    (n, p) => n + Math.max(0, (p.total as number) - (p.used as number)),
    0
  );
  if (available <= 0) {
    return NextResponse.json({ error: "no_credit" }, { status: 409 });
  }
  if (slots.length > available) {
    return NextResponse.json(
      { error: "not_enough_credits", available },
      { status: 409 }
    );
  }
  // Durée et format : ceux de la prestation du pack qui sera débité en
  // premier (repli 60 min, présentiel).
  const first = (packs ?? [])[0];
  const svc = first
    ? Array.isArray(first.services)
      ? first.services[0]
      : first.services
    : null;
  const durationMin = Math.min(
    240,
    Math.max(15, (svc?.duration_min as number | null) ?? 60)
  );
  const online =
    body.online === true ||
    (svc?.location as string | null) === "online";

  const noticeMs = ((coach.min_notice_hours as number) || 2) * 3600000;
  const instant = coach.booking_mode !== "approval";
  const booked: { id: string; starts_at: string; ends_at: string }[] = [];
  let failure: string | null = null;

  for (const iso of slots) {
    const starts = new Date(iso);
    const ends = new Date(starts.getTime() + durationMin * 60000);
    if (starts.getTime() < Date.now() + noticeMs) {
      failure = "too_soon";
      break;
    }
    // Créneau libre (séances en attente / confirmées, verrous de paiement).
    const [{ data: overlapping }, { data: holds }] = await Promise.all([
      admin
        .from("bookings")
        .select("id")
        .eq("coach_id", coachId)
        .in("status", ["pending", "confirmed"])
        .lt("starts_at", ends.toISOString())
        .gt("ends_at", starts.toISOString())
        .limit(1),
      admin
        .from("slot_holds")
        .select("id")
        .eq("coach_id", coachId)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .lt("starts_at", ends.toISOString())
        .gt("ends_at", starts.toISOString())
        .limit(1),
    ]);
    if ((overlapping ?? []).length > 0 || (holds ?? []).length > 0) {
      failure = "slot_taken";
      break;
    }

    // Séance créée EN ATTENTE puis crédit consommé : si aucun crédit n'est
    // finalement disponible (course), la séance est retirée.
    const { data: booking } = await admin
      .from("bookings")
      .insert({
        coach_id: coachId,
        client_id: clientRow.id,
        service_id: (first?.service_id as string | null) ?? null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "pending",
        location: online ? "online" : "in_person",
      })
      .select("id")
      .single();
    if (!booking) {
      failure = "generic";
      break;
    }
    const { data: creditId } = await admin.rpc("pack_credit_consume", {
      p_coach: coachId,
      p_client: clientRow.id,
      p_booking: booking.id,
      p_actor: "client",
    });
    if (!creditId) {
      await admin.from("bookings").delete().eq("id", booking.id);
      failure = "no_credit";
      break;
    }
    if (instant) {
      await admin
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id);
    }
    booked.push({
      id: booking.id as string,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });
  }

  if (booked.length === 0) {
    return NextResponse.json({ error: failure ?? "generic" }, { status: 409 });
  }

  // Crédits restants après ces réservations.
  const { data: after } = await admin
    .from("pack_credits")
    .select("total, used")
    .eq("coach_id", coachId)
    .eq("client_id", clientRow.id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  const remaining = (after ?? []).reduce(
    (n, p) => n + Math.max(0, (p.total as number) - (p.used as number)),
    0
  );

  // Agenda Google / Meet (instantané seulement), emails et cloches :
  // best-effort, la réservation est déjà acquise.
  try {
    const coachName =
      [coach.first_name, coach.last_name].filter(Boolean).join(" ") ||
      "Ton coach";
    const clientName =
      [clientRow.first_name, clientRow.last_name].filter(Boolean).join(" ") ||
      "Ton client";
    const tz = (coach.timezone as string | null) || "Europe/Paris";
    const fmt = (iso: string, loc: "fr" | "en") =>
      new Date(iso).toLocaleString(loc === "en" ? "en-GB" : "fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      });

    if (instant) {
      await Promise.allSettled(
        booked.map((b) =>
          attachMeetToBooking(admin, {
            bookingId: b.id,
            coachId,
            starts: new Date(b.starts_at),
            ends: new Date(b.ends_at),
            clientName,
            clientEmail: clientRow.email as string | null,
          })
        )
      );
    }

    const placeStr = online
      ? undefined
      : [coach.gym_name, coach.gym_address].filter(Boolean).join(" · ") ||
        undefined;
    const tplClient = packSessionBookedClient({
      coachName,
      dates: booked.map((b) => fmt(b.starts_at, "fr")),
      confirmed: instant,
      remaining,
      online,
      placeStr,
      spaceUrl: `${APP_URL}/espace`,
    });
    await sendEmail({
      to: user.email,
      subject: tplClient.subject,
      html: tplClient.html,
    });
    await notifyClient(admin, {
      email: user.email,
      type: "booked",
      coachName,
      startsAt: booked[0].starts_at,
      bookingId: booked[0].id,
    });
    if (remaining <= 2) {
      await notifyClient(admin, {
        email: user.email,
        type: remaining === 0 ? "pack_empty" : "pack_low",
        coachName,
        startsAt: null,
        bookingId: null,
      });
    }

    const { data: coachAuth } = await admin.auth.admin.getUserById(coachId);
    const coachEmail = coachAuth?.user?.email;
    if (coachEmail) {
      const coachLocale = coach.locale === "en" ? ("en" as const) : ("fr" as const);
      const tplCoach = packSessionBookedCoach({
        locale: coachLocale,
        clientName,
        dates: booked.map((b) => fmt(b.starts_at, coachLocale)),
        confirmed: instant,
        remaining,
        dashboardUrl: `${APP_URL}/dashboard/agenda`,
      });
      await sendEmail({ to: coachEmail, subject: tplCoach.subject, html: tplCoach.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    ok: true,
    booked: booked.map((b) => b.id),
    confirmed: instant,
    remaining,
    // Un créneau sur plusieurs a échoué : le client le voit.
    partial_error: failure,
  });
}
