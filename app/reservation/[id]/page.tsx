import Link from "next/link";
import { coachPlaceStr } from "@/lib/coach/place";
import { createClient } from "@supabase/supabase-js";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ReportProblem from "@/components/booking/ReportProblem";
import ReviewForm from "@/components/reviews/ReviewForm";
import { VideoIcon, CalendarIcon } from "@/components/ui/icons";
import { googleCalendarUrl, icsUrl } from "@/lib/calendar/links";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export const dynamic = "force-dynamic";

// Page publique d'une réservation (après paiement, ou depuis l'email de
// confirmation). Affiche le statut du séquestre et permet de signaler un
// problème tant que les fonds ne sont pas libérés. Lecture via service role
// (les bookings sont protégés par RLS côté client).
type BookingInfo = {
  starts_at: string;
  ends_at: string;
  status: string;
  location: string;
  meeting_url: string | null;
  coach_name: string;
  escrow_status: string | null;
  // Séance annulée : remboursement partiel effectué ou non (les colonnes
  // amount/refunded distinguent une annulation tardive d'un remboursement).
  partial_refund: boolean;
  // Lieu de la séance en présentiel (salle + adresse), null en visio.
  place: string | null;
};

async function getBooking(id: string): Promise<BookingInfo | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const admin = createClient(SUPABASE_URL, key);
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "starts_at, ends_at, status, location, location_text, meeting_url, coaches(first_name, last_name, gym_name, gym_address, outdoor_address)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!booking) return null;
  const { data: payment } = await admin
    .from("payments")
    .select("escrow_status, amount_cents, refunded_cents")
    .eq("booking_id", id)
    .maybeSingle();
  type CoachRow = {
    first_name: string | null;
    last_name: string | null;
    gym_name: string | null;
    gym_address: string | null;
    outdoor_address?: string | null;
  };
  const coach = booking.coaches as CoachRow | CoachRow[] | null;
  const c = Array.isArray(coach) ? coach[0] : coach;
  const refundedCents = (payment?.refunded_cents as number | null) ?? 0;
  return {
    starts_at: booking.starts_at as string,
    ends_at: booking.ends_at as string,
    status: booking.status as string,
    location: (booking.location as string) ?? "in_person",
    meeting_url: (booking.meeting_url as string | null) ?? null,
    coach_name: [c?.first_name, c?.last_name].filter(Boolean).join(" "),
    escrow_status: payment?.escrow_status ?? null,
    partial_refund:
      refundedCents > 0 &&
      refundedCents < ((payment?.amount_cents as number | null) ?? 0),
    // Lieu : texte posé sur la séance, sinon salle + adresse du coach.
    place:
      booking.location === "online"
        ? null
        : (booking.location_text as string | null) ||
          coachPlaceStr(c) ||
          null,
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
        locale === "fr" ? "fr-FR" : "en-GB",
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
    authorized: r.statusAuthorized,
    held: r.statusHeld,
    released: r.statusReleased,
    refunded: r.statusRefunded,
    // « canceled » = annulée sans remboursement intégral : le reste a été
    // versé au coach. Ce n'est pas « remboursée ».
    canceled: booking?.partial_refund
      ? r.statusCanceledPartial
      : r.statusCanceledNoRefund,
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
              <Link
                href="/coachs"
                className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                {dict.clientSpace.findCoach}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card p-6 sm:p-8">
              {searchParams.paid === "1" && (
                <div className="mb-5 rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm font-medium text-accent">
                  {booking.status === "pending" ? r.pendingBanner : r.paidBanner}
                </div>
              )}
              <h1 className="text-xl font-extrabold tracking-tight text-text-base">
                {r.title}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {dateStr} · {r.withCoach} {booking.coach_name}
              </p>
              {booking.place && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-text-muted">
                  <svg className="mt-0.5 shrink-0 text-accent" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                  </svg>
                  <span className="break-words">{booking.place}</span>
                </p>
              )}

              {booking.escrow_status && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {statusLabel[booking.escrow_status] ?? booking.escrow_status}
                </p>
              )}

              {/* Demande en attente d'acceptation : on rassure explicitement
                  (empreinte seulement, rien n'est débité d'ici la réponse). */}
              {booking.status === "pending" && (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold text-text-base">
                    {r.pendingTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {booking.escrow_status === "authorized"
                      ? r.pendingDescAuthorized
                      : r.pendingDesc}
                  </p>
                </div>
              )}

              {/* Visio + ajout au calendrier (séance à venir non annulée) */}
              {booking.status !== "cancelled" &&
                new Date(booking.ends_at).getTime() > Date.now() && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {booking.location === "online" && booking.meeting_url && (
                      <a
                        href={booking.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                      >
                        <VideoIcon size={13} className="mr-1.5 inline-block align-[-2px]" />{r.joinMeeting}
                      </a>
                    )}
                    {(() => {
                      const calEvent = {
                        title: `${r.calSession} ${booking.coach_name}`,
                        start: new Date(booking.starts_at),
                        end: new Date(booking.ends_at),
                        details: [
                          booking.meeting_url
                            ? `${r.calVideo} ${booking.meeting_url}`
                            : null,
                          `${r.calMy} ${APP_URL}/reservation/${params.id}`,
                        ]
                          .filter(Boolean)
                          .join("\n"),
                        location:
                          booking.meeting_url ?? booking.place ?? undefined,
                      };
                      const chip =
                        "rounded-full border border-border-strong px-4 py-2 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-text-base";
                      return (
                        <>
                          <a
                            href={googleCalendarUrl(calEvent)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={chip}
                          >
                            <CalendarIcon size={13} className="mr-1.5 inline-block align-[-2px]" />Google Agenda
                          </a>
                          <a href={icsUrl(calEvent)} className={chip}>
                            <CalendarIcon size={13} className="mr-1.5 inline-block align-[-2px]" />Apple / Outlook
                          </a>
                        </>
                      );
                    })()}
                  </div>
                )}

              {/* Sortie vers l'espace client : c'est là que vivent
                  l'annulation et toutes les autres séances. Cette page est
                  celle du lien reçu par email, elle ne doit pas être un
                  cul-de-sac. */}
              <p className="mt-5">
                {/* Deux tons : le verbe en sourdine, la destination
                    « Mes séances » en accent, sinon tout se fond dans la
                    même ligne verte. Séance passée : plus question de
                    « gérer ou annuler », on invite juste à retrouver son
                    historique. */}
                <Link
                  href="/espace"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
                >
                  {new Date(booking.ends_at).getTime() < Date.now()
                    ? r.historyInSpace
                    : r.manageInSpace}{" "}
                  <span className="font-semibold text-accent underline underline-offset-4">
                    {r.manageInSpaceLink}
                  </span>
                  <svg className="text-accent" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </p>

              {booking.escrow_status === "held" && (
                <div className="mt-6 border-t border-border pt-6">
                  <ReportProblem bookingId={params.id} />
                </div>
              )}

              {/* Avis après la séance (1 client = 1 avis par coach) */}
              {booking.status !== "cancelled" &&
                new Date(booking.ends_at).getTime() < Date.now() && (
                  <div className="mt-6 border-t border-border pt-6">
                    {/* L'email n'est pas injecté depuis le serveur : cette
                        page est publique, quiconque a l'URL pourrait sinon
                        noter au nom du client. Le formulaire pré-remplit
                        depuis la session, champ éditable. */}
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
