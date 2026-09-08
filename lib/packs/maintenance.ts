import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { packExtendedClient, packExtendedCoach } from "@/lib/email/templates";
import { computeFreeSlots } from "@/lib/booking/freeSlots";
import { refundPackRemainder } from "@/lib/packs/refund";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Délais des protections (décisions du 8 septembre 2026).
export const REFUND_ANSWER_DAYS = 7; // réponse du coach à une demande
export const OFFLINE_REFUND_DAYS = 14; // coach dépublié / Stripe coupé
export const EXTEND_WINDOW_DAYS = 7; // pack qui expire sous 7 jours
export const EXTEND_DAYS = 30; // prolongation accordée
export const MAX_EXTENSIONS = 2;
export const LOOKAHEAD_DAYS = 14; // aucun créneau libre sur 14 jours = coach en cause

export type PackMaintenanceReport = {
  autoRefunded: number;
  offlineRefunded: number;
  extended: number;
  errors: string[];
};

// Entretien quotidien des packs (cron de versement, avant l'expiration) :
//  1. demandes de remboursement sans réponse du coach sous 7 jours → remboursées ;
//  2. coach hors ligne depuis 14 jours → reste de ses packs actifs remboursé ;
//  3. pack qui expire sous 7 jours avec des séances restantes alors que le
//     coach est en cause (aucun créneau libre sur 14 jours, ou au moins
//     deux séances de ce pack annulées par lui) → prolongé de 30 jours,
//     deux fois au plus.
export async function runPackMaintenance(
  admin: SupabaseClient,
  stripe: Stripe,
  budget: { startedAt: number; budgetMs: number }
): Promise<PackMaintenanceReport> {
  const report: PackMaintenanceReport = {
    autoRefunded: 0,
    offlineRefunded: 0,
    extended: 0,
    errors: [],
  };
  const inBudget = () => Date.now() - budget.startedAt < budget.budgetMs;
  const nowMs = Date.now();

  // 1. Demandes sans réponse.
  try {
    const { data: pending } = await admin
      .from("pack_credits")
      .select("id")
      .eq("status", "active")
      .eq("refund_request_status", "pending")
      .lte(
        "refund_requested_at",
        new Date(nowMs - REFUND_ANSWER_DAYS * 86400000).toISOString()
      )
      .limit(50);
    for (const p of pending ?? []) {
      if (!inBudget()) break;
      const out = await refundPackRemainder(admin, stripe, {
        packId: p.id as string,
        actor: "system",
        note: "Demande de remboursement restée sans réponse du coach sous 7 jours",
        mode: "no_answer",
      });
      if (out.ok) report.autoRefunded++;
      else if (out.error === "nothing_refundable" || out.error === "not_refundable") {
        // Rien ne peut être rendu par la plateforme (fonds déjà versés) :
        // on solde la demande pour ne pas la retraiter chaque nuit.
        await admin
          .from("pack_credits")
          .update({ refund_request_status: "auto", refund_responded_at: new Date().toISOString() })
          .eq("id", p.id)
          .eq("refund_request_status", "pending");
        report.errors.push(`${p.id}: demande sans fonds remboursables (${out.error})`);
      } else report.errors.push(`${p.id}: ${out.error}`);
    }
  } catch (e) {
    report.errors.push(`pending: ${e instanceof Error ? e.message : "error"}`);
  }

  // 2. Coach parti.
  try {
    const { data: offline } = await admin
      .from("coaches")
      .select("id")
      .not("offline_since", "is", null)
      .lte("offline_since", new Date(nowMs - OFFLINE_REFUND_DAYS * 86400000).toISOString())
      .limit(50);
    const ids = (offline ?? []).map((c) => c.id as string);
    if (ids.length > 0) {
      const { data: packs } = await admin
        .from("pack_credits")
        .select("id, total, used")
        .in("coach_id", ids)
        .eq("status", "active")
        .not("payment_id", "is", null)
        .limit(100);
      for (const p of packs ?? []) {
        if (!inBudget()) break;
        if ((p.total as number) - (p.used as number) <= 0) continue;
        const out = await refundPackRemainder(admin, stripe, {
          packId: p.id as string,
          actor: "system",
          note: "Coach plus disponible sur Madger : reste du pack remboursé",
          mode: "coach_offline",
        });
        if (out.ok) report.offlineRefunded++;
        else if (out.error !== "nothing_refundable" && out.error !== "not_refundable")
          report.errors.push(`${p.id}: ${out.error}`);
      }
    }
  } catch (e) {
    report.errors.push(`offline: ${e instanceof Error ? e.message : "error"}`);
  }

  // 3. Expiration imminente alors que le coach est en cause.
  try {
    const { data: expiring } = await admin
      .from("pack_credits")
      .select(
        "id, coach_id, client_id, total, used, expires_at, extended_count, service_name, clients(email, first_name, last_name), coaches(first_name, last_name, timezone, min_notice_hours, locale)"
      )
      .eq("status", "active")
      .not("expires_at", "is", null)
      .gt("expires_at", new Date(nowMs).toISOString())
      .lte("expires_at", new Date(nowMs + EXTEND_WINDOW_DAYS * 86400000).toISOString())
      .lt("extended_count", MAX_EXTENSIONS)
      .limit(100);
    // Créneaux libres calculés une fois par coach.
    const freeByCoach = new Map<string, number>();
    for (const p of expiring ?? []) {
      if (!inBudget()) break;
      const remaining = (p.total as number) - (p.used as number);
      if (remaining <= 0) continue;
      const co = Array.isArray(p.coaches) ? p.coaches[0] : p.coaches;
      const cl = Array.isArray(p.clients) ? p.clients[0] : p.clients;
      const coachId = p.coach_id as string;

      // Le coach a annulé au moins deux séances de ce pack ?
      const { count: coachCancels } = await admin
        .from("credit_events")
        .select("id", { count: "exact", head: true })
        .eq("pack_credit_id", p.id)
        .eq("reason", "cancel_restore")
        .eq("actor", "coach");
      let culprit = (coachCancels ?? 0) >= 2;
      if (!culprit) {
        if (!freeByCoach.has(coachId)) {
          const res = await computeFreeSlots(
            admin,
            {
              id: coachId,
              timezone: (co?.timezone as string | null) ?? null,
              min_notice_hours: (co?.min_notice_hours as number | null) ?? null,
            },
            { durationMin: 60, daysAhead: LOOKAHEAD_DAYS }
          );
          // Saisie libre (pas de grille) : impossible de dire qu'il n'y a
          // aucun créneau, on considère le coach disponible.
          freeByCoach.set(coachId, res.mode === "free" ? 1 : res.total);
        }
        culprit = (freeByCoach.get(coachId) ?? 1) === 0;
      }
      if (!culprit) continue;

      const { data: newExpires } = await admin.rpc("pack_credit_extend", {
        p_pack: p.id,
        p_days: EXTEND_DAYS,
        p_note:
          (coachCancels ?? 0) >= 2
            ? "Séances annulées par le coach"
            : "Aucun créneau libre chez le coach",
      });
      if (!newExpires) continue;
      report.extended++;

      // Client et coach prévenus (best-effort).
      try {
        const coachName =
          [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "Ton coach";
        const newExpiresStr = new Date(newExpires as string).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Paris",
        });
        if (cl?.email) {
          const tpl = packExtendedClient({
            coachName,
            packName: (p.service_name as string | null) ?? "Pack",
            remaining,
            newExpiresStr,
            spaceUrl: `${APP_URL}/espace`,
          });
          await sendEmail({ to: cl.email as string, subject: tpl.subject, html: tpl.html });
        }
        const { data: coachAuth } = await admin.auth.admin.getUserById(coachId);
        if (coachAuth?.user?.email) {
          const coachLocale = co?.locale === "en" ? ("en" as const) : ("fr" as const);
          const tpl = packExtendedCoach({
            locale: coachLocale,
            clientName:
              [cl?.first_name, cl?.last_name].filter(Boolean).join(" ") ||
              (coachLocale === "en" ? "A client" : "Un client"),
            packName: (p.service_name as string | null) ?? "Pack",
            remaining,
            newExpiresStr: new Date(newExpires as string).toLocaleDateString(
              coachLocale === "en" ? "en-GB" : "fr-FR",
              { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }
            ),
            availabilityUrl: `${APP_URL}/dashboard/disponibilites`,
          });
          await sendEmail({ to: coachAuth.user.email, subject: tpl.subject, html: tpl.html });
        }
      } catch {
        /* best-effort */
      }
    }
  } catch (e) {
    report.errors.push(`extend: ${e instanceof Error ? e.message : "error"}`);
  }

  return report;
}
