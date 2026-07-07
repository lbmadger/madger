import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ClientSpace, {
  type ClientBooking,
  type ClientPack,
  type ClientSub,
} from "@/components/client/ClientSpace";

export const metadata: Metadata = {
  title: "Madger · Mes séances",
  robots: { index: false, follow: false },
};

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
      // Abonnements mensuels (actifs ou en cours d'arrêt).
      const { data: subRows } = await admin
        .from("client_subscriptions")
        .select(
          "id, status, current_period_end, services(name, price_cents), coaches(first_name, last_name)"
        )
        .in("client_id", clientIds)
        .order("created_at", { ascending: false });
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
      const { data: creditRows } = await admin
        .from("pack_credits")
        .select(
          "id, total, used, services(name), coaches(first_name, last_name)"
        )
        .in("client_id", clientIds)
        .order("created_at", { ascending: false });
      for (const c of creditRows ?? []) {
        const svc = Array.isArray(c.services) ? c.services[0] : c.services;
        const co = Array.isArray(c.coaches) ? c.coaches[0] : c.coaches;
        packs.push({
          id: c.id as string,
          total: c.total as number,
          used: c.used as number,
          service_name: (svc?.name as string) ?? "Pack",
          coach_name:
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "-",
        });
      }

      const { data: rows } = await admin
        .from("bookings")
        .select(
          "id, starts_at, ends_at, status, location, coaches(first_name, last_name, slug, cancellation_policy, refund_over_24h_pct, refund_under_24h_pct)"
        )
        .in("client_id", clientIds)
        .order("starts_at", { ascending: false })
        .limit(100);

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
            .select("payment_id, total, used")
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
          coach_name:
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "-",
          coach_slug: (co?.slug as string) ?? null,
          cancellation_policy:
            (co?.cancellation_policy as ClientBooking["cancellation_policy"]) ??
            "moderate",
          refund_over_24h_pct: (co?.refund_over_24h_pct as number) ?? null,
          refund_under_24h_pct: (co?.refund_under_24h_pct as number) ?? null,
          escrow_status: (pay?.escrow_status as string) ?? null,
          amount_cents: (pay?.amount_cents as number) ?? null,
          released_cents: (pay?.released_cents as number) ?? 0,
          refunded_cents: (pay?.refunded_cents as number) ?? 0,
          pack_total:
            ((pay && packByPayment.get(pay.id as string)?.total) as number) ??
            null,
          pack_used:
            ((pay && packByPayment.get(pay.id as string)?.used) as number) ??
            null,
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
