import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ReportProblem from "@/components/booking/ReportProblem";
import ReviewForm from "@/components/reviews/ReviewForm";

export const dynamic = "force-dynamic";

// Page publique d'une réservation (après paiement, ou depuis l'email de
// confirmation). Affiche le statut du séquestre et permet de signaler un
// problème tant que les fonds ne sont pas libérés. Lecture via service role
// (les bookings sont protégés par RLS côté client).
type BookingInfo = {
  starts_at: string;
  ends_at: string;
  status: string;
  coach_name: string;
  escrow_status: string | null;
};

async function getBooking(id: string): Promise<BookingInfo | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const admin = createClient(SUPABASE_URL, key);
  const { data: booking } = await admin
    .from("bookings")
    .select("starts_at, ends_at, status, coaches(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!booking) return null;
  const { data: payment } = await admin
    .from("payments")
    .select("escrow_status")
    .eq("booking_id", id)
    .maybeSingle();
  const coach = booking.coaches as
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
  const c = Array.isArray(coach) ? coach[0] : coach;
  return {
    starts_at: booking.starts_at as string,
    ends_at: booking.ends_at as string,
    status: booking.status as string,
    coach_name: [c?.first_name, c?.last_name].filter(Boolean).join(" "),
    escrow_status: payment?.escrow_status ?? null,
  };
}

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { paid?: string };
}) {
  const { locale, dict } = getServerDictionary();
  const r = dict.reservation;
  const booking = await getBooking(params.id);

  const dateStr = booking
    ? new Date(booking.starts_at).toLocaleString(
        locale === "fr" ? "fr-FR" : "en-US",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          // Le serveur tourne en UTC : sans fuseau explicite, l'heure
          // affichée serait décalée de 1 à 2 h.
          timeZone: "Europe/Paris",
        }
      )
    : "";

  const statusLabel: Record<string, string> = {
    held: r.statusHeld,
    released: r.statusReleased,
    refunded: r.statusRefunded,
    canceled: r.statusRefunded,
    disputed: r.statusDisputed,
  };

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <main className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-14">
          {!booking ? (
            <div className="rounded-2xl border border-border bg-bg-card p-6 text-center">
              <p className="text-text-muted">{r.notFound}</p>
              <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
                {r.backHome}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card p-6 sm:p-8">
              {searchParams.paid === "1" && (
                <div className="mb-5 rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm font-medium text-accent">
                  {r.paidBanner}
                </div>
              )}
              <h1 className="text-xl font-extrabold tracking-tight text-text-base">
                {r.title}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {dateStr} · {r.withCoach} {booking.coach_name}
              </p>

              {booking.escrow_status && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {statusLabel[booking.escrow_status] ?? booking.escrow_status}
                </p>
              )}

              {booking.escrow_status === "held" && (
                <div className="mt-6 border-t border-border pt-6">
                  <ReportProblem bookingId={params.id} />
                </div>
              )}

              {/* Avis après la séance (1 client = 1 avis par coach) */}
              {booking.status !== "cancelled" &&
                new Date(booking.ends_at).getTime() < Date.now() && (
                  <div className="mt-6 border-t border-border pt-6">
                    <ReviewForm bookingId={params.id} />
                  </div>
                )}
            </div>
          )}
        </main>
      </div>
    </I18nProvider>
  );
}
