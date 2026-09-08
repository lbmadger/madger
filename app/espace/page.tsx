import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProRow } from "@/lib/subscription/plan";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ClientSpace, {
  type ClientBooking,
  type ClientPack,
  type ClientSub,
} from "@/components/client/ClientSpace";

// Titre d'onglet dans la langue de l'utilisateur (page bilingue).
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = getServerDictionary();
  return {
    title: locale === "en" ? "Madger · My sessions" : "Madger · Mes séances",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

// Espace client « Mes séances » : toutes les réservations rattachées à
// l'email (vérifié) du compte connecté, chez tous les coachs. Lecture via
// service role : les fiches clients sont des lignes CRM par coach, reliées au
// compte par l'email — le middleware garantit la session.
export default async function ClientSpacePage() {
  const { locale, dict } = getServerDictionary();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bookings: ClientBooking[] = [];
  const packs: ClientPack[] = [];
  const subs: ClientSub[] = [];
  const admin = createAdminClient();

  if (user?.email && admin) {
    const email = user.email.trim().toLowerCase();
    const { data: clientRows } = await admin
      .from("clients")
      .select("id")
      .ilike("email", email);
    const clientIds = (clientRows ?? []).map((c) => c.id as string);

    if (clientIds.length > 0) {
      // Abonnements, packs et réservations ne dépendent que de clientIds :
      // une seule vague de requêtes au lieu de trois allers-retours en série.
      const [{ data: subRows }, { data: creditRows }, { data: rows }] =
        await Promise.all([
          admin
            .from("client_subscriptions")
            .select(
              "id, status, current_period_end, services(name, price_cents), coaches(first_name, last_name)"
            )
            .in("client_id", clientIds)
            .order("created_at", { ascending: false }),
          admin
            .from("pack_credits")
            .select(
              "id, coach_id, total, used, status, expires_at, service_name, cancel_hours, max_per_week, payment_id, refund_request_status, refund_requested_at, refund_refused_reason, extended_count, services(name, duration_min), coaches(first_name, last_name, slug, booking_mode)"
            )
            .in("client_id", clientIds)
            .order("created_at", { ascending: false }),
          admin
            .from("bookings")
            .select(
              "id, starts_at, ends_at, status, location, location_text, reschedule_pending_until, rescheduled_from, pack_credit_id, pack_credits(cancel_hours), group_sessions(name), coaches(first_name, last_name, slug, cancellation_policy, refund_over_24h_pct, refund_under_24h_pct, cancel_hours, gym_name, gym_address, pro_until, pro_bonus_until)"
            )
            .in("client_id", clientIds)
            .order("starts_at", { ascending: false })
            .limit(100),
        ]);
      for (const s of subRows ?? []) {
        const svc = Array.isArray(s.services) ? s.services[0] : s.services;
        const co = Array.isArray(s.coaches) ? s.coaches[0] : s.coaches;
        subs.push({
          id: s.id as string,
          status: s.status as string,
          current_period_end: (s.current_period_end as string | null) ?? null,
          service_name: (svc?.name as string) ?? "Abonnement",
          price_cents: (svc?.price_cents as number) ?? 0,
          coach_name:
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "-",
        });
      }

      // Packs de séances (crédits restants chez chaque coach).
      for (const c of creditRows ?? []) {
        const svc = Array.isArray(c.services) ? c.services[0] : c.services;
        const co = Array.isArray(c.coaches) ? c.coaches[0] : c.coaches;
        packs.push({
          id: c.id as string,
          total: c.total as number,
          used: c.used as number,
          status: ((c.status as string | null) ?? "active"),
          expires_at: (c.expires_at as string | null) ?? null,
          // Instantané du nom à l'achat (l'offre peut être renommée après).
          service_name:
            (c.service_name as string | null) ?? (svc?.name as string) ?? "Pack",
          coach_name:
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "-",
          coach_id: c.coach_id as string,
          coach_slug: (co?.slug as string | null) ?? null,
          coach_booking_mode: (co?.booking_mode as string | null) ?? "instant",
          duration_min: (svc?.duration_min as number | null) ?? 60,
          cancel_hours: (c.cancel_hours as number | null) ?? null,
          max_per_week: (c.max_per_week as number | null) ?? null,
          refundable: !!c.payment_id,
          refund_request_status: (c.refund_request_status as string | null) ?? null,
          refund_requested_at: (c.refund_requested_at as string | null) ?? null,
          refund_refused_reason: (c.refund_refused_reason as string | null) ?? null,
          extended_count: (c.extended_count as number | null) ?? 0,
        });
      }

      const ids = (rows ?? []).map((b) => b.id as string);
      const { data: pays } = ids.length
        ? await admin
            .from("payments")
            .select("id, booking_id, escrow_status, amount_cents, currency, released_cents, refunded_cents")
            .in("booking_id", ids)
        : { data: [] };
      const payByBooking = new Map(
        (pays ?? []).map((p) => [p.booking_id as string, p])
      );
      // Packs rattachés aux paiements (prorata du remboursement affiché).
      const payIds = (pays ?? []).map((p) => p.id as string);
      const { data: packRows } = payIds.length
        ? await admin
            .from("pack_credits")
            .select("payment_id, total, paid_total, used")
            .in("payment_id", payIds)
        : { data: [] };
      const packByPayment = new Map(
        (packRows ?? []).map((pc) => [pc.payment_id as string, pc])
      );

      for (const b of rows ?? []) {
        const co = Array.isArray(b.coaches) ? b.coaches[0] : b.coaches;
        const pay = payByBooking.get(b.id as string);
        bookings.push({
          id: b.id as string,
          starts_at: b.starts_at as string,
          ends_at: b.ends_at as string,
          status: b.status as string,
          location: b.location as string,
          // Lieu de la séance en présentiel : texte posé sur la séance,
          // sinon salle + adresse du coach.
          place:
            b.location === "online"
              ? null
              : (b.location_text as string | null) ||
                [co?.gym_name, co?.gym_address].filter(Boolean).join(" · ") ||
                null,
          coach_name:
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "-",
          coach_slug: (co?.slug as string) ?? null,
          group_name: (() => {
            const g = Array.isArray(b.group_sessions) ? b.group_sessions[0] : b.group_sessions;
            return (g?.name as string | null) ?? null;
          })(),
          cancellation_policy:
            (co?.cancellation_policy as ClientBooking["cancellation_policy"]) ??
            "moderate",
          cancel_hours: (co?.cancel_hours as number | null) ?? null,
          // Plan du coach : règle d'annulation fixe (Essentiel) ou la sienne (Pro).
          pro: isProRow(co as { pro_until?: string | null; pro_bonus_until?: string | null } | null),
          // Séance sur pack (crédit) : l'annulation suit le délai du pack.
          on_credit: !!b.pack_credit_id,
          credit_cancel_hours: (() => {
            const pc = Array.isArray(b.pack_credits) ? b.pack_credits[0] : b.pack_credits;
            return (pc?.cancel_hours as number | null) ?? null;
          })(),
          refund_over_24h_pct: (co?.refund_over_24h_pct as number) ?? null,
          refund_under_24h_pct: (co?.refund_under_24h_pct as number) ?? null,
          escrow_status: (pay?.escrow_status as string) ?? null,
          amount_cents: (pay?.amount_cents as number) ?? null,
          released_cents: (pay?.released_cents as number) ?? 0,
          refunded_cents: (pay?.refunded_cents as number) ?? 0,
          pack_total:
            ((pay && packByPayment.get(pay.id as string)?.total) as number) ??
            null,
          pack_paid_total:
            ((pay && packByPayment.get(pay.id as string)?.paid_total) as number | null) ??
            null,
          pack_used:
            ((pay && packByPayment.get(pay.id as string)?.used) as number) ??
            null,
          reschedule_pending_until:
            (b.reschedule_pending_until as string | null) ?? null,
          rescheduled_from: (b.rescheduled_from as string | null) ?? null,
        });
      }
    }
  }

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <ClientSpace bookings={bookings} packs={packs} subs={subs} />
      </div>
    </I18nProvider>
  );
}
