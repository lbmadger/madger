import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ClientSpace, {
  type ClientBooking,
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
  const admin = createAdminClient();

  if (user?.email && admin) {
    const email = user.email.trim().toLowerCase();
    const { data: clientRows } = await admin
      .from("clients")
      .select("id")
      .ilike("email", email);
    const clientIds = (clientRows ?? []).map((c) => c.id as string);

    if (clientIds.length > 0) {
      const { data: rows } = await admin
        .from("bookings")
        .select(
          "id, starts_at, ends_at, status, location, coaches(first_name, last_name, slug, cancellation_policy)"
        )
        .in("client_id", clientIds)
        .order("starts_at", { ascending: false })
        .limit(100);

      const ids = (rows ?? []).map((b) => b.id as string);
      const { data: pays } = ids.length
        ? await admin
            .from("payments")
            .select("booking_id, escrow_status, amount_cents, currency")
            .in("booking_id", ids)
        : { data: [] };
      const payByBooking = new Map(
        (pays ?? []).map((p) => [p.booking_id as string, p])
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
            [co?.first_name, co?.last_name].filter(Boolean).join(" ") || "—",
          coach_slug: (co?.slug as string) ?? null,
          cancellation_policy:
            (co?.cancellation_policy as ClientBooking["cancellation_policy"]) ??
            "moderate",
          escrow_status: (pay?.escrow_status as string) ?? null,
          amount_cents: (pay?.amount_cents as number) ?? null,
        });
      }
    }
  }

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <ClientSpace bookings={bookings} />
      </div>
    </I18nProvider>
  );
}
