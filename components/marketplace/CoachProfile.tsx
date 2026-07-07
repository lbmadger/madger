"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import PolicyTiers from "@/components/booking/PolicyTiers";
import Stars from "@/components/reviews/Stars";
import BookingModal from "./BookingModal";
import { TrophyIcon, MapPinIcon, BuildingIcon, StarIcon } from "@/components/ui/icons";
import {
  type PublicCoach,
  type PublicReview,
  coachFullName,
  coachInitials,
  isSuperCoach,
} from "@/lib/coaches/public-types";
import { type PublicService, formatPrice } from "@/lib/services/types";

// Profil public d'un coach (page madger.app/<slug>). Les CTA Réserver /
// Contacter seront branchés à l'étape suivante (réservation + messagerie).
export default function CoachProfile({
  coach,
  services = [],
  reviews = [],
}: {
  coach: PublicCoach;
  services?: PublicService[];
  reviews?: PublicReview[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>();
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  // Paiement Stripe interrompu (retour via cancel_url) : on l'explique.
  const [paymentCanceled, setPaymentCanceled] = useState(false);

  // Retour de connexion/inscription ou de Stripe avec ?book=<serviceId|1> :
  // rouvre le modal de réservation là où le client s'était arrêté (le
  // brouillon local restaure prestation, créneau et champs).
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const book = params.get("book");
    if (params.get("payment") === "canceled") setPaymentCanceled(true);
    if (book) {
      setBookingServiceId(book === "1" ? undefined : book);
      // Créneau porté par l'URL : restauration même sans brouillon local
      // (confirmation email ouverte sur un autre appareil).
      setBookingSlot(params.get("slot"));
      setBooking(true);
      // Nettoie l'URL pour ne pas rouvrir le modal à chaque refresh.
      params.delete("book");
      params.delete("slot");
      params.delete("payment");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`
      );
    }
  }, []);

  // Ouvre (ou crée) la conversation avec ce coach, puis redirige vers le fil.
  // Non connecté → inscription client, avec retour sur le profil ensuite.
  async function handleContact() {
    setContactError(null);
    setContacting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/signup?role=client&redirect=${encodeURIComponent(`/${coach.slug}`)}`
        );
        return;
      }
      if (user.id === coach.id) {
        router.push("/dashboard/messages");
        return;
      }

      // Conversation existante ?
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("coach_id", coach.id)
        .eq("client_id", user.id)
        .maybeSingle();

      let convId = existing?.id as string | undefined;
      if (!convId) {
        const clientName =
          (user.user_metadata?.full_name as string | undefined) ||
          user.email ||
          "Client";
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({
            coach_id: coach.id,
            client_id: user.id,
            coach_name: coachFullName(coach),
            client_name: clientName,
          })
          .select("id")
          .single();
        if (error || !created) {
          setContactError(t("messages.startError"));
          return;
        }
        convId = created.id as string;
      }
      router.push(`/messages/${convId}`);
    } catch {
      setContactError(t("messages.startError"));
    } finally {
      setContacting(false);
    }
  }

  function priceLine(s: PublicService): string {
    const base = formatPrice(s.price_cents, s.currency, locale);
    return s.type === "subscription" ? `${base}${t("services.perMonth")}` : base;
  }

  // Prix d'appel de la carte de réservation : la séance payante la moins
  // chère (hors packs/abonnements pour rester lisible).
  const paid = services.filter((s) => s.price_cents > 0);
  const singles = paid.filter((s) => s.type === "single");
  const fromService = (singles.length ? singles : paid).reduce<
    PublicService | null
  >((min, s) => (!min || s.price_cents < min.price_cents ? s : min), null);
  const openBooking = (serviceId?: string) => {
    setBookingServiceId(serviceId);
    setBooking(true);
  };
  const instant = coach.booking_mode === "instant";

  function metaLine(s: PublicService): string {
    const parts: string[] = [t(`services.types.${s.type}`)];
    if (s.type === "pack" && s.pack_size) {
      parts.push(`${s.pack_size} ${t("services.sessionsLabel")}`);
      // Prix ramené à la séance : l'économie du pack devient visible.
      if (s.pack_size > 1)
        parts.push(
          `${formatPrice(Math.round(s.price_cents / s.pack_size), s.currency, locale)} ${t("coachProfile.perSession")}`
        );
    }
    if (s.duration_min) parts.push(`${s.duration_min} min`);
    return parts.join(" · ");
  }

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:pb-12">
      {/* Halo d'ambiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-220px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[120px]" />
      </div>

      <Link
        href="/coachs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t("coachProfile.backToSearch")}
      </Link>

      {/* Paiement interrompu : rien n'a été débité, on invite à reprendre. */}
      {paymentCanceled && (
        <p className="mb-4 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-sm text-text-base">
          {t("booking.paymentCanceledBanner")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="rounded-2xl border border-border bg-bg-card p-6 sm:p-8">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          {coach.avatar_url ? (
            <Image
              src={coach.avatar_url}
              alt={coachFullName(coach)}
              width={112}
              height={112}
              className="h-24 w-24 shrink-0 rounded-2xl border border-border-strong object-cover sm:h-28 sm:w-28"
            />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-3xl font-bold text-accent sm:h-28 sm:w-28">
              {coachInitials(coach)}
            </span>
          )}
          <div className="mt-4 sm:ml-6 sm:mt-1">
            <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-extrabold tracking-tight text-text-base sm:justify-start">
              {coachFullName(coach)}
              {isSuperCoach(coach) && (
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-black">
                  <TrophyIcon size={12} className="mr-1 inline-block align-[-2px]" />{t("marketplace.superCoach")}
                </span>
              )}
            </h1>
            {coach.specialty && (
              <p className="mt-1 text-sm text-text-muted">{coach.specialty}</p>
            )}
            {/* Note moyenne (1 client = 1 avis) */}
            {coach.rating_avg != null && coach.rating_count > 0 && (
              <p className="mt-1.5 flex items-center justify-center gap-1.5 sm:justify-start">
                <Stars value={Number(coach.rating_avg)} />
                <span className="text-sm font-semibold text-text-base">
                  {Number(coach.rating_avg).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </span>
                <span className="text-xs text-text-dim">
                  ({coach.rating_count} {t("reviews.countLabel")})
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {coach.sport && (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  {t(`taxonomy.sports.${coach.sport}`)}
                </span>
              )}
              {coach.city && (
                <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-muted">
                  <MapPinIcon size={12} className="mr-1 inline-block align-[-2px]" />{coach.city}
                </span>
              )}
              {/* Où se passent les séances (salle nommée, domicile, extérieur) */}
              {coach.gym_name && (coach.venues ?? []).includes("coach_gym") && (
                <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-muted">
                  <BuildingIcon size={12} className="mr-1 inline-block align-[-2px]" />{coach.gym_name}
                </span>
              )}
              {(coach.venues ?? [])
                .filter((v) => v === "client_home" || v === "outdoor")
                .map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-muted"
                  >
                    {t(`taxonomy.venues.${v}`)}
                  </span>
                ))}
              {coach.accepts_online && (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  {t("coachProfile.onlineAvailable")}
                </span>
              )}
            </div>
            {(coach.specialties ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {(coach.specialties ?? []).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-accent/25 px-2.5 py-1 text-xs text-text-muted"
                  >
                    {t(`clientOnboarding.goals.${s}`)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {coach.bio && (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {t("coachProfile.about")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-base">
              {coach.bio}
            </p>
          </div>
        )}

        {/* Prestations */}
        {services.length > 0 && (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {t("coachProfile.services")}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {services.map((s) => (
                <li key={s.id}>
                  {/* Cliquer une prestation ouvre la réservation avec le
                      calendrier des créneaux, prestation présélectionnée. */}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingServiceId(s.id);
                      setBooking(true);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-base">
                        {s.name}
                      </p>
                      <p className="text-xs text-text-muted">{metaLine(s)}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 font-bold text-accent">
                      {priceLine(s)}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Avis clients */}
        {reviews.length > 0 && (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {t("reviews.sectionTitle")}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-bg-elevated p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-base">
                      {r.client_first_name}
                    </span>
                    <Stars value={r.rating} size={12} />
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                      {r.comment}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-text-dim">
                    {new Date(r.created_at).toLocaleDateString(
                      locale === "fr" ? "fr-FR" : "en-US",
                      { month: "long", year: "numeric" }
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Politique d'annulation (paiements sécurisés) */}
        {coach.stripe_charges_enabled && (
          <div className="mt-6 border-t border-border pt-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {t("cancellation.publicLabel")}
            </h2>
            <div className="mt-3 rounded-xl border border-border bg-bg-elevated p-4">
              <PolicyTiers policy={coach.cancellation_policy} />
              <Link
                href="/charte-paiement"
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                {t("cancellation.seeCharter")}
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Carte de réservation (desktop) : collante, façon Airbnb */}
      <aside className="hidden lg:sticky lg:top-24 lg:block">
        <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          {fromService && (
            <p className="text-text-base">
              <span className="text-xs text-text-muted">
                {t("coachProfile.from")}{" "}
              </span>
              <span className="text-2xl font-extrabold tracking-tight">
                {formatPrice(fromService.price_cents, fromService.currency, locale)}
              </span>
              <span className="text-xs text-text-muted">
                {" "}
                {t("coachProfile.perSession")}
              </span>
            </p>
          )}
          {coach.rating_avg != null && coach.rating_count > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5">
              <Stars value={Number(coach.rating_avg)} size={12} />
              <span className="text-xs text-text-muted">
                {Number(coach.rating_avg)} ({coach.rating_count})
              </span>
            </p>
          )}

          <Button className="mt-4 w-full" onClick={() => openBooking()}>
            {t("coachProfile.book")}
          </Button>
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={handleContact}
            disabled={contacting}
          >
            {t("coachProfile.contact")}
          </Button>

          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-muted">
            {instant
              ? t("coachProfile.instantNote")
              : t("coachProfile.approvalNote")}
          </p>
          {contactError && (
            <p role="alert" className="mt-2 text-sm text-danger">{contactError}</p>
          )}
        </div>
      </aside>
      </div>

      {/* Barre de réservation mobile, fixe en bas */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            {fromService ? (
              <p className="truncate text-sm text-text-base">
                <span className="font-extrabold">
                  {formatPrice(fromService.price_cents, fromService.currency, locale)}
                </span>
                <span className="text-xs text-text-muted">
                  {" "}
                  {t("coachProfile.perSession")}
                </span>
              </p>
            ) : (
              <p className="truncate text-sm font-semibold text-text-base">
                {coachFullName(coach)}
              </p>
            )}
            {coach.rating_avg != null && coach.rating_count > 0 && (
              <p className="flex items-center gap-1 text-[11px] text-text-muted">
                <StarIcon size={11} className="mr-1 inline-block align-[-1px] text-accent" />{Number(coach.rating_avg)} ({coach.rating_count})
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              onClick={handleContact}
              disabled={contacting}
              className="px-4 py-2.5 text-sm"
            >
              {t("coachProfile.contact")}
            </Button>
            <Button onClick={() => openBooking()} className="px-5 py-2.5 text-sm">
              {t("coachProfile.book")}
            </Button>
          </div>
        </div>
      </div>

      {booking && (
        <BookingModal
          coach={coach}
          services={services}
          initialServiceId={bookingServiceId}
          initialSlot={bookingSlot}
          onClose={() => setBooking(false)}
          onContact={handleContact}
        />
      )}
    </main>
  );
}
