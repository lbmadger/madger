import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import {
  sessionReminderClient,
  onboardingNudgeCoach,
  onboardingNudgeCoachLater,
  reviewReminderClient,
  packLowClient,
  packEmptyClient,
  packExpiringClient,
  clientsFollowUpCoach,
} from "@/lib/email/templates";
import { notifyClient } from "@/lib/notifications/client";
import { cronAuthorized } from "@/lib/cron/auth";
import { isProRow } from "@/lib/subscription/plan";
import { isMondayInParis, runWeeklyRecap } from "@/lib/cron/weeklyRecap";
import { sendSms, sessionReminderSms, smsConfigured } from "@/lib/sms/twilio";
import { isFrenchMobile, toE164 } from "@/lib/sms/phone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Job planifié : envoie un rappel par email aux clients dont la séance a lieu
// dans les ~24 h à venir et qui n'ont pas encore été rappelés.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const now = Date.now();
  const soon = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Traité PAR LOTS jusqu'à épuisement (ou fin du budget temps) : tous les
  // rappels du jour partent, quel que soit le nombre de coachs. Les envois
  // en échec (quota email…) ne sont pas marqués et repasseront.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  let sent = 0;
  let smsSent = 0;
  let scanned = 0;
  const skipIds = new Set<string>();

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        "id, starts_at, location, location_text, meeting_url, reminder_sent_at, reminder_sms_sent_at, status, clients(first_name, email, phone), coaches(first_name, last_name, timezone, gym_name, gym_address, sms_reminders_enabled, pro_until, pro_bonus_until)"
      )
      .eq("status", "confirmed")
      .eq("is_block", false)
      .is("reminder_sent_at", null)
      .gt("starts_at", nowIso)
      .lte("starts_at", soon)
      .limit(100);
    const batch = (bookings ?? []).filter((b) => !skipIds.has(b.id as string));
    if (batch.length === 0) break;
    scanned += batch.length;

  for (const b of batch) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
    const coach = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
    const email = client?.email as string | undefined;
    let delivered = false;
    if (email) {
      const coachName =
        [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
        "ton coach";
      const dateStr = new Date(b.starts_at as string).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        // Fuseau du coach : la séance a lieu à son heure locale.
        timeZone: (coach?.timezone as string | null) || "Europe/Paris",
      });
      // Séance le jour même (cron de 7 h) : le sujet ne doit pas dire
      // « demain ».
      const sameDay =
        new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: (coach?.timezone as string | null) || "Europe/Paris" }).format(new Date(b.starts_at as string)) ===
        new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: (coach?.timezone as string | null) || "Europe/Paris" }).format(new Date());
      const t = sessionReminderClient({
        coachName,
        dateStr,
        sameDay,
        online: b.location === "online",
        reservationUrl: `${APP_URL}/reservation/${b.id}`,
        meetUrl:
          b.location === "online"
            ? (b.meeting_url as string | null) ?? undefined
            : undefined,
        // Lieu : texte posé sur la séance, sinon salle + adresse du coach.
        placeStr:
          b.location === "online"
            ? undefined
            : (b.location_text as string | null) ||
              [coach?.gym_name, coach?.gym_address]
                .filter(Boolean)
                .join(" · ") ||
              undefined,
      });
      delivered = await sendEmail({ to: email, subject: t.subject, html: t.html });
      if (delivered) sent++;

      // Rappel SMS (migration 0070) : réglage Pro du coach, mobile du client
      // au format E.164. Tenté une seule fois par séance (reminder_sms_sent_at).
      // Best-effort : un SMS refusé n'empêche jamais l'email ni le marquage.
      if (
        smsConfigured() &&
        coach?.sms_reminders_enabled === true &&
        isProRow(coach as { pro_until?: string | null; pro_bonus_until?: string | null }) &&
        !b.reminder_sms_sent_at
      ) {
        const to = toE164(client?.phone as string | null);
        if (to && (!to.startsWith("+33") || isFrenchMobile(to))) {
          const body = sessionReminderSms({
            firstName: (client?.first_name as string | null) ?? null,
            coachName,
            dateStr,
            online: b.location === "online",
            placeStr:
              b.location === "online"
                ? null
                : (b.location_text as string | null) ||
                  [coach?.gym_name, coach?.gym_address].filter(Boolean).join(", ") ||
                  null,
            url: `${APP_URL}/reservation/${b.id}`,
          });
          if (await sendSms({ to, body })) {
            smsSent++;
            await supabase
              .from("bookings")
              .update({ reminder_sms_sent_at: nowIso })
              .eq("id", b.id);
          }
        }
      }
    }
    // Marqué rappelé seulement si l'email est parti (ou s'il n'y a pas
    // d'adresse : inutile de rescanner la ligne à chaque run).
    if (delivered || !email) {
      await supabase
        .from("bookings")
        .update({ reminder_sent_at: nowIso })
        .eq("id", b.id);
    } else {
      // Échec d'envoi : écarté du run courant, retenté au prochain.
      skipIds.add(b.id as string);
    }
  }
  }

  // ── Relances onboarding abandonné : 24 h puis 7 jours ─────────────────────
  // Suivi EN BASE (migration 0051) : un cron sauté rattrape les comptes au
  // passage suivant, un cron rejoué ne double jamais. Borne basse 30 jours :
  // on ne réveille pas les comptes dormants antérieurs au dispositif.
  let nudged = 0;
  const nudgeSteps = [
    { minAgeMs: 1 * 86400000, column: "onboarding_nudge1_at", template: onboardingNudgeCoach },
    { minAgeMs: 7 * 86400000, column: "onboarding_nudge2_at", template: onboardingNudgeCoachLater },
  ] as const;
  try {
    for (const w of nudgeSteps) {
      const cutoff = new Date(now - w.minAgeMs).toISOString();
      const floor = new Date(now - 30 * 86400000).toISOString();
      const { data: stale } = await supabase
        .from("coaches")
        .select("id, first_name")
        .eq("onboarding_completed", false)
        .is(w.column, null)
        .lte("created_at", cutoff)
        .gte("created_at", floor)
        .limit(100);
      for (const c of stale ?? []) {
        // L'email vit dans Auth, pas dans coaches : lecture via l'API admin.
        const { data: u } = await supabase.auth.admin.getUserById(
          c.id as string
        );
        const email = u?.user?.email;
        if (!email) {
          // Pas d'adresse : marqué quand même, inutile de rescanner.
          await supabase
            .from("coaches")
            .update({ [w.column]: nowIso })
            .eq("id", c.id);
          continue;
        }
        const tpl = w.template({
          firstName: (c.first_name as string | null) || null,
          dashboardUrl: `${APP_URL}/dashboard`,
        });
        if (
          await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })
        ) {
          nudged++;
          await supabase
            .from("coaches")
            .update({ [w.column]: nowIso })
            .eq("id", c.id);
        }
      }
    }
  } catch {
    /* la relance ne doit jamais faire échouer les rappels de séance */
  }

  // ── Relance d'avis unique à J+3 ───────────────────────────────────────────
  // La demande initiale part du cron release à la libération du paiement.
  // Ici : séance terminée depuis 3 à 10 jours, toujours aucun avis du client
  // chez ce coach, jamais relancé (migration 0055). Une seule relance, jamais
  // deux : la colonne est posée même quand un avis existe déjà, pour ne pas
  // rescanner la ligne à chaque passage.
  let reviewNudged = 0;
  try {
    const from = new Date(now - 10 * 86400000).toISOString();
    const to = new Date(now - 3 * 86400000).toISOString();
    const { data: candidates } = await supabase
      .from("bookings")
      .select(
        "id, coach_id, client_id, clients(email), coaches(first_name, last_name)"
      )
      .eq("status", "completed")
      .eq("is_block", false)
      .is("review_reminder_sent_at", null)
      .gte("ends_at", from)
      .lte("ends_at", to)
      .limit(100);
    for (const b of candidates ?? []) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      const cl = Array.isArray(b.clients) ? b.clients[0] : b.clients;
      const co = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
      const email = cl?.email as string | undefined;

      // Déjà noté ? (1 client = 1 avis par coach) → marqué, pas d'email.
      let hasReview = false;
      if (b.client_id) {
        const { data: rev } = await supabase
          .from("reviews")
          .select("id")
          .eq("coach_id", b.coach_id)
          .eq("client_id", b.client_id)
          .maybeSingle();
        hasReview = Boolean(rev);
      }

      if (hasReview || !email) {
        await supabase
          .from("bookings")
          .update({ review_reminder_sent_at: nowIso })
          .eq("id", b.id);
        continue;
      }

      const tpl = reviewReminderClient({
        coachName:
          [co?.first_name, co?.last_name].filter(Boolean).join(" ") ||
          "ton coach",
        reservationUrl: `${APP_URL}/reservation/${b.id}`,
      });
      if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
        reviewNudged++;
        await supabase
          .from("bookings")
          .update({ review_reminder_sent_at: nowIso })
          .eq("id", b.id);
      }
    }
  } catch {
    /* colonne 0055 absente ou erreur : ne casse jamais les autres rappels */
  }

  // ── Relances packs côté client (lot 3, migration 0059) ────────────────────
  // Une fois par pack et par seuil : plus que 2 séances, pack épuisé, pack
  // qui expire dans les 7 jours. Email + cloche de l'espace client.
  let packNudged = 0;
  try {
    const in7d = new Date(now + 7 * 86400000).toISOString();
    const { data: packs } = await supabase
      .from("pack_credits")
      .select(
        "id, coach_id, client_id, total, used, expires_at, low_notified_at, empty_notified_at, expiring_notified_at, clients(email, first_name), coaches(first_name, last_name, slug, pro_until, pro_bonus_until)"
      )
      .eq("status", "active")
      .limit(500);
    for (const pk of packs ?? []) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      const cl = Array.isArray(pk.clients) ? pk.clients[0] : pk.clients;
      const co = Array.isArray(pk.coaches) ? pk.coaches[0] : pk.coaches;
      // Relances de renouvellement : fonctionnalité Pro. Un coach repassé
      // Essentiel n'en envoie plus (rien n'est marqué : elles repartent s'il
      // revient en Pro).
      if (!isProRow(co as { pro_until?: string | null; pro_bonus_until?: string | null } | null)) continue;
      const email = cl?.email as string | undefined;
      const coachName =
        [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "ton coach";
      const remaining = Math.max(0, (pk.total as number) - (pk.used as number));
      const expiresAt = pk.expires_at as string | null;
      const expiresStr = expiresAt
        ? new Date(expiresAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            timeZone: "Europe/Paris",
          })
        : null;
      const mark = async (col: string) =>
        supabase.from("pack_credits").update({ [col]: nowIso }).eq("id", pk.id);

      if (!email) {
        // Sans adresse : marqué pour ne pas rescanner.
        if (remaining <= 2 && !pk.low_notified_at) await mark("low_notified_at");
        if (remaining === 0 && !pk.empty_notified_at) await mark("empty_notified_at");
        continue;
      }

      // Épuisé (prioritaire sur « plus que 2 »).
      if (remaining === 0 && !pk.empty_notified_at) {
        const tpl = packEmptyClient({
          coachName,
          coachUrl: co?.slug ? `${APP_URL}/${co.slug}` : `${APP_URL}/coachs`,
        });
        if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
          packNudged++;
          await mark("empty_notified_at");
          if (!pk.low_notified_at) await mark("low_notified_at");
          await notifyClient(supabase, { email, type: "pack_empty", coachName });
        }
        continue;
      }
      // Plus que 2 séances (ou 1).
      if (remaining > 0 && remaining <= 2 && !pk.low_notified_at) {
        const tpl = packLowClient({
          coachName,
          remaining,
          expiresStr,
          spaceUrl: `${APP_URL}/espace`,
        });
        if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
          packNudged++;
          await mark("low_notified_at");
          await notifyClient(supabase, { email, type: "pack_low", coachName });
        }
      }
      // Expire dans 7 jours avec des séances restantes.
      if (
        remaining > 0 &&
        expiresAt &&
        expiresStr &&
        expiresAt <= in7d &&
        expiresAt > nowIso &&
        !pk.expiring_notified_at
      ) {
        const tpl = packExpiringClient({
          coachName,
          remaining,
          expiresStr,
          spaceUrl: `${APP_URL}/espace`,
        });
        if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
          packNudged++;
          await mark("expiring_notified_at");
          await notifyClient(supabase, { email, type: "pack_expiring", coachName });
        }
      }
    }
  } catch {
    /* colonnes 0059 absentes ou erreur : ne casse jamais les rappels */
  }

  // ── Alertes churn pour le coach (lot 3) ──────────────────────────────────
  // Un email par coach et par jour, listant : clients sans séance depuis 14
  // jours (dernière séance entre 14 et 90 jours, aucune à venir, pas encore
  // alertés depuis cette dernière séance) et packs qui expirent sous 7 jours
  // avec des séances restantes.
  let coachAlerted = 0;
  try {
    const in7d = new Date(now + 7 * 86400000).toISOString();
    const since90 = new Date(now - 90 * 86400000).toISOString();
    const cutoff14 = new Date(now - 14 * 86400000).toISOString();

    type Item = { clientId: string; clientName: string; kind: "inactive" | "pack_expiring"; detail: string; packId?: string };
    const byCoach = new Map<string, Item[]>();

    // Packs qui expirent (non encore signalés au coach).
    const { data: expPacks } = await supabase
      .from("pack_credits")
      .select("id, coach_id, client_id, total, used, expires_at, clients(first_name, last_name)")
      .eq("status", "active")
      .is("expiring_coach_notified_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", in7d)
      .gt("expires_at", nowIso)
      .limit(300);
    for (const pk of expPacks ?? []) {
      const remaining = Math.max(0, (pk.total as number) - (pk.used as number));
      if (remaining === 0) {
        await supabase.from("pack_credits").update({ expiring_coach_notified_at: nowIso }).eq("id", pk.id);
        continue;
      }
      const cl = Array.isArray(pk.clients) ? pk.clients[0] : pk.clients;
      const list = byCoach.get(pk.coach_id as string) ?? [];
      list.push({
        clientId: pk.client_id as string,
        packId: pk.id as string,
        clientName: [cl?.first_name, cl?.last_name].filter(Boolean).join(" ") || "Client",
        kind: "pack_expiring",
        detail: `pack expire le ${new Date(pk.expires_at as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })} · ${remaining} séance${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`,
      });
      byCoach.set(pk.coach_id as string, list);
    }

    // Clients inactifs : dernière séance (non annulée) terminée il y a 14 à
    // 90 jours, rien à venir, et pas encore alertés depuis cette séance.
    const { data: recent } = await supabase
      .from("bookings")
      .select("coach_id, client_id, ends_at, status")
      .eq("is_block", false)
      .neq("status", "cancelled")
      .not("client_id", "is", null)
      .gte("ends_at", since90)
      .order("ends_at", { ascending: false })
      .limit(5000);
    const lastEnd = new Map<string, { coach: string; end: string }>();
    const hasFuture = new Set<string>();
    for (const b of recent ?? []) {
      const key = b.client_id as string;
      if ((b.ends_at as string) > nowIso) {
        hasFuture.add(key);
        continue;
      }
      if (!lastEnd.has(key)) lastEnd.set(key, { coach: b.coach_id as string, end: b.ends_at as string });
    }
    const inactiveIds = Array.from(lastEnd.entries())
      .filter(([id, v]) => !hasFuture.has(id) && v.end <= cutoff14)
      .map(([id]) => id);
    if (inactiveIds.length > 0) {
      const { data: cls } = await supabase
        .from("clients")
        .select("id, coach_id, first_name, last_name, churn_alerted_at")
        .in("id", inactiveIds.slice(0, 500));
      for (const c of cls ?? []) {
        const last = lastEnd.get(c.id as string);
        if (!last) continue;
        const alerted = c.churn_alerted_at as string | null;
        if (alerted && alerted >= last.end) continue; // déjà alerté pour cette période
        const days = Math.floor((now - new Date(last.end).getTime()) / 86400000);
        const list = byCoach.get(c.coach_id as string) ?? [];
        list.push({
          clientId: c.id as string,
          clientName: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Client",
          kind: "inactive",
          detail: `${days} jours sans séance`,
        });
        byCoach.set(c.coach_id as string, list);
      }
    }

    for (const [coachId, items] of Array.from(byCoach.entries())) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      if (items.length === 0) continue;
      const [{ data: u }, { data: co }] = await Promise.all([
        supabase.auth.admin.getUserById(coachId),
        supabase.from("coaches").select("first_name, locale, pro_until, pro_bonus_until").eq("id", coachId).maybeSingle(),
      ]);
      const email = u?.user?.email;
      const markPacks = async () => {
        const packIds = items.filter((i) => i.packId).map((i) => i.packId as string);
        if (packIds.length) {
          await supabase.from("pack_credits").update({ expiring_coach_notified_at: nowIso }).in("id", packIds);
        }
      };
      // Alerte churn : fonctionnalité Pro. Les packs d'un coach Essentiel
      // sont tout de même marqués : sinon ils resteraient chaque jour en tête
      // de la file (limite 300) et finiraient par masquer ceux des coachs Pro.
      // Les clients inactifs ne sont pas marqués : l'alerte part s'il passe Pro.
      if (!isProRow(co as { pro_until?: string | null; pro_bonus_until?: string | null } | null)) {
        await markPacks();
        continue;
      }
      const markAll = async () => {
        await markPacks();
        const clientIds = items.filter((i) => i.kind === "inactive").map((i) => i.clientId);
        if (clientIds.length) {
          await supabase.from("clients").update({ churn_alerted_at: nowIso }).in("id", clientIds);
        }
      };
      if (!email) {
        await markAll();
        continue;
      }
      const tpl = clientsFollowUpCoach({
        firstName: (co?.first_name as string | null) ?? null,
        items: items.map((i) => ({ clientName: i.clientName, kind: i.kind, detail: i.detail })),
        clientsUrl: `${APP_URL}/dashboard/clients`,
        locale: co?.locale === "en" ? "en" : "fr",
      });
      if (await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })) {
        coachAlerted++;
        await markAll();
      }
    }
  } catch {
    /* best-effort */
  }

  // ── Récap hebdo (lundi) ───────────────────────────────────────────────────
  // Fusionné ici : Vercel Hobby n'accorde que deux crons planifiés. Budget
  // temps propre pour ne jamais retarder les rappels du jour.
  let weekly: { sent: number; scanned: number } | null = null;
  if (isMondayInParis()) {
    try {
      const remaining = Math.max(5_000, 55_000 - (Date.now() - startedAt));
      weekly = await runWeeklyRecap(supabase, { budgetMs: remaining });
    } catch (e) {
      console.error("weekly recap failed:", e);
    }
  }

  return NextResponse.json({ sent, smsSent, scanned, nudged, reviewNudged, packNudged, coachAlerted, weekly });
}
