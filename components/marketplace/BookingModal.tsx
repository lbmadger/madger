"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import PolicyTiers from "@/components/booking/PolicyTiers";
import { resolveRefundPolicy } from "@/lib/booking/cancellation";
import { LockIcon, RepeatIcon, MapPinIcon } from "@/components/ui/icons";
import { inputClass, labelClass } from "@/lib/ui/styles";
import type { PublicCoach } from "@/lib/coaches/public-types";
import { type PublicService, formatPrice } from "@/lib/services/types";

const DURATIONS = [30, 45, 60, 90];

type Slot = { iso: string; label: string };
type SlotDay = { date: string; slots: Slot[] };
type SlotState =
  | { mode: "loading" }
  | { mode: "free" }
  | { mode: "error" }
  | { mode: "slots"; days: SlotDay[] };

export default function BookingModal({
  coach,
  services = [],
  initialServiceId,
  initialSlot,
  onClose,
  onContact,
}: {
  coach: PublicCoach;
  services?: PublicService[];
  initialServiceId?: string;
  // Créneau porté par l'URL de retour (?slot=...) : permet de retrouver la
  // sélection même sur un AUTRE appareil (confirmation email ouverte sur
  // téléphone alors que la réservation a commencé sur ordinateur).
  initialSlot?: string | null;
  onClose: () => void;
  // Ouvre la conversation avec le coach (proposé quand aucun créneau libre).
  onContact?: () => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const instant = coach.booking_mode === "instant";

  // Prestations payantes (paiement possible seulement si le coach encaisse).
  // Les abonnements mensuels sont souscrits en récurrent (Stripe) : pas de
  // créneau à choisir, le coach planifie ensuite avec son client.
  const paidServices = coach.stripe_charges_enabled
    ? services.filter((s) => s.price_cents > 0)
    : [];

  // Coach sans ville mais dispo en ligne → réservation en visio par défaut.
  const [online, setOnline] = useState(!coach.city && coach.accepts_online);
  const [website, setWebsite] = useState(""); // honeypot (invisible)
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  // Coach avec des prestations payantes : la « demande simple sans paiement »
  // disparaît (elle permettrait de réserver un vrai créneau sans payer) ; la
  // première prestation est présélectionnée.
  const [serviceId, setServiceId] = useState(
    initialServiceId && paidServices.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : paidServices[0]?.id ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Id renvoyé par l'API : lien de suivi de la demande.
  const [bookingId, setBookingId] = useState<string | null>(null);
  // Compte obligatoire pour réserver (modèle Airbnb/Doctolib), mais exigé au
  // DERNIER clic seulement : le client choisit prestation et créneau
  // librement, l'authentification n'arrive qu'au moment de payer.
  // undefined = vérification en cours, null = non connecté.
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(
    undefined
  );
  // true = le client a cliqué Réserver sans compte : écran d'authentification
  // avec retour direct sur son créneau (brouillon conservé).
  const [needAuth, setNeedAuth] = useState(false);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const mail = data.user?.email ?? null;
        setSessionEmail(mail);
        if (mail) setEmail(mail);
      })
      .catch(() => setSessionEmail(null));
  }, []);

  // Brouillon de réservation : sauvegardé avant le détour connexion /
  // inscription, restauré au retour (le client retrouve son créneau).
  const draftKey = `madger_booking_draft_${coach.slug}`;
  const draftSlotRef = useRef<string | null>(null);
  // true = créneau du brouillon retrouvé : petit message de confiance.
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      localStorage.removeItem(draftKey);
      const d = JSON.parse(raw) as Record<string, string | number | boolean>;
      if (typeof d.firstName === "string") setFirstName(d.firstName);
      if (typeof d.lastName === "string") setLastName(d.lastName);
      if (typeof d.phone === "string") setPhone(d.phone);
      if (typeof d.message === "string") setMessage(d.message);
      if (typeof d.online === "boolean") setOnline(d.online);
      if (typeof d.duration === "number") setDuration(d.duration);
      if (typeof d.date === "string") setDate(d.date);
      if (typeof d.time === "string") setTime(d.time);
      if (typeof d.serviceId === "string" && d.serviceId) {
        if (paidServices.some((s) => s.id === d.serviceId))
          setServiceId(d.serviceId);
      }
      if (typeof d.slot === "string" && d.slot) draftSlotRef.current = d.slot;
    } catch {
      /* brouillon illisible : on repart de zéro */
    }
    // Pas de brouillon local (autre appareil) : le créneau de l'URL prend
    // le relais.
    if (!draftSlotRef.current && initialSlot)
      draftSlotRef.current = initialSlot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraft() {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          serviceId,
          slot: selectedIso,
          online,
          duration,
          date,
          time,
          firstName,
          lastName,
          phone,
          message,
        })
      );
    } catch {
      /* stockage indisponible : tant pis pour le brouillon */
    }
  }

  // Créneaux réels (dispos du coach − séances déjà prises).
  const [slotState, setSlotState] = useState<SlotState>({ mode: "loading" });
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const selectedService = paidServices.find((s) => s.id === serviceId) ?? null;
  const payMode = !!selectedService;
  // Abonnement mensuel : souscription récurrente, aucun créneau à choisir.
  const isSubscription = selectedService?.type === "subscription";
  // Prestation choisie = durée imposée par la prestation (60 min par défaut) :
  // le client ne choisit jamais la durée d'une prestation payante.
  const effectiveDuration = selectedService
    ? selectedService.duration_min ?? 60
    : duration;

  // Charge les créneaux ; re-calcule si la durée change (prestation choisie).
  // `retry` force un rechargement après une erreur réseau.
  const [slotRetry, setSlotRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setSlotState({ mode: "loading" });
    setSelectedIso(null);
    fetch(`/api/slots?coach=${coach.slug}&duration=${effectiveDuration}&locale=${locale}`)
      .then((r) => {
        if (!r.ok) throw new Error("slots_failed");
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        if (data.mode === "slots") {
          const days = data.days as SlotDay[];
          setSlotState({ mode: "slots", days });
          const first = days.findIndex((d) => d.slots.length > 0);
          setDayIdx(first === -1 ? 0 : first);
          // Retour de connexion : re-sélectionne le créneau du brouillon
          // s'il est toujours libre. La ref n'est consommée qu'une fois le
          // créneau retrouvé : si la durée change juste après (prestation
          // restaurée), le rechargement suivant retente proprement.
          const ds = draftSlotRef.current;
          if (ds) {
            const idx = days.findIndex((d) =>
              d.slots.some((s) => s.iso === ds)
            );
            if (idx !== -1) {
              setDayIdx(idx);
              setSelectedIso(ds);
              setDraftRestored(true);
              draftSlotRef.current = null;
            }
          }
        } else {
          setSlotState({ mode: "free" });
        }
      })
      // Erreur réseau/serveur : on n'ouvre PAS la saisie libre (elle
      // permettrait de réserver un créneau déjà pris), on propose de
      // réessayer.
      .catch(() => alive && setSlotState({ mode: "error" }));
    return () => {
      alive = false;
    };
  }, [coach.slug, effectiveDuration, slotRetry, locale]);

  function dayChipLabel(dateISO: string): string {
    const d = new Date(dateISO + "T12:00:00");
    return d.toLocaleDateString(loc, { weekday: "short", day: "2-digit", month: "2-digit" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Départ de séance : créneau choisi (mode slots) ou saisie libre.
    // Abonnement : aucun créneau requis (le coach planifie ensuite).
    let starts: Date | null = null;
    if (!isSubscription) {
      if (slotState.mode === "error" || slotState.mode === "loading") {
        return setError(t("booking.errors.slotsUnavailable"));
      }
      if (slotState.mode === "slots") {
        if (!selectedIso) return setError(t("booking.errors.slotRequired"));
        starts = new Date(selectedIso);
      } else {
        if (!date || !time) return setError(t("booking.errors.dateRequired"));
        starts = new Date(`${date}T${time}`);
        if (starts.getTime() < Date.now())
          return setError(t("booking.errors.datePast"));
      }
    }

    // Compte exigé au dernier clic seulement : le choix est fait, on
    // sauvegarde le brouillon et on envoie vers connexion / inscription.
    if (!sessionEmail) {
      saveDraft();
      setNeedAuth(true);
      return;
    }

    if (!firstName.trim()) return setError(t("booking.errors.nameRequired"));
    if (!email.trim()) return setError(t("booking.errors.emailRequired"));

    setLoading(true);
    try {
      // ── Prestation payante : on part sur le paiement Stripe ──────────────
      if (payMode && selectedService) {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coach_slug: coach.slug,
            service_id: selectedService.id,
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
            email: email.trim(),
            phone: phone.trim() || null,
            starts_at: starts ? starts.toISOString() : null,
            duration_min: effectiveDuration,
            online,
            message: message.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.client_secret || data.url) {
          // Brouillon sauvegardé aussi avant Stripe : si le client annule le
          // paiement, il retrouve créneau et champs au retour.
          saveDraft();
          if (data.client_secret) {
            // Paiement EMBARQUÉ : le formulaire Stripe s'affiche sur
            // /paiement, aux couleurs Madger. `back` rouvre la modale avec
            // le brouillon si le client renonce.
            const back = `/${coach.slug}?payment=canceled&book=${selectedService.id}`;
            window.location.href = `/paiement?cs=${encodeURIComponent(data.client_secret)}&back=${encodeURIComponent(back)}`;
          } else {
            window.location.href = data.url; // secours : page Stripe hébergée
          }
          return;
        }
        if (data.error === "too_soon") setError(t("booking.errors.tooSoon"));
        else setError(t("booking.errors.generic"));
        return;
      }

      // ── Demande simple gratuite ───────────────────────────────────────────
      const res = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_slug: coach.slug,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim(),
          phone: phone.trim() || null,
          starts_at: starts ? starts.toISOString() : null,
          duration_min: effectiveDuration,
          message: message.trim() || null,
          online,
          website, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "rate_limited")
          setError(t("booking.errors.rateLimited"));
        else if (data.error === "date_in_past")
          setError(t("booking.errors.datePast"));
        else if (data.error === "slot_taken")
          setError(t("booking.errors.slotTaken"));
        else if (data.error === "too_soon")
          setError(t("booking.errors.tooSoon"));
        else if (data.error === "payment_required")
          setError(t("booking.errors.paymentRequired"));
        else
          setError(
            data.detail
              ? `${t("booking.errors.generic")} (${data.detail})`
              : t("booking.errors.generic")
          );
        return;
      }
      if (data.booking_id) setBookingId(data.booking_id as string);
      setDone(true);
    } catch {
      setError(t("booking.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  const currentDay =
    slotState.mode === "slots" ? slotState.days[dayIdx] : undefined;
  const anySlots =
    slotState.mode === "slots" &&
    slotState.days.some((d) => d.slots.length > 0);

  return (
    <Dialog
      onClose={onClose}
      label={t("booking.title")}
      className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-text-base">
              {instant ? t("booking.confirmedTitle") : t("booking.successTitle")}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              {instant ? t("booking.confirmedDesc") : t("booking.successDesc")}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {bookingId && (
                <Link href={`/reservation/${bookingId}`} className="w-full">
                  <Button className="w-full">{t("booking.viewBooking")}</Button>
                </Link>
              )}
              <Link href="/espace" className="w-full">
                <Button
                  variant={bookingId ? "secondary" : "primary"}
                  className="w-full"
                >
                  {t("clientSpace.title")}
                </Button>
              </Link>
              <Button variant="ghost" onClick={onClose}>
                {t("booking.cancel")}
              </Button>
            </div>
          </div>
        ) : needAuth ? (
          /* Compte exigé au moment de réserver : le créneau choisi est
             conservé, on y revient directement après connexion. */
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <LockIcon size={20} />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight text-text-base">
              {t("booking.authRequiredTitle")}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              {t("booking.authRequiredDesc")}
            </p>
            {selectedIso && (
              <p className="mx-auto mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                {t("booking.slotKept")}{" "}
                {new Date(selectedIso).toLocaleString(loc, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/signup?role=client&redirect=${encodeURIComponent(`/${coach.slug}?book=${serviceId || "1"}${selectedIso ? `&slot=${encodeURIComponent(selectedIso)}` : ""}`)}`}
                className="w-full"
              >
                <Button className="w-full">{t("booking.createAccount")}</Button>
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/${coach.slug}?book=${serviceId || "1"}${selectedIso ? `&slot=${encodeURIComponent(selectedIso)}` : ""}`)}`}
                className="w-full"
              >
                <Button variant="secondary" className="w-full">
                  {t("booking.loginCta")}
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setNeedAuth(false)}>
                {t("booking.backToBooking")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-extrabold tracking-tight text-text-base">
              {t("booking.title")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {instant ? t("booking.descInstant") : t("booking.desc")}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              {/* Honeypot : invisible pour les humains, piège à bots. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0"
                aria-hidden="true"
              />

              {/* Prestation payante (si le coach encaisse via Stripe) */}
              {paidServices.length > 0 && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.service")}</span>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className={inputClass}
                  >
                    {paidServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ·{" "}
                        {formatPrice(s.price_cents, s.currency, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Prestation cliquée mais non payable en ligne (coach sans
                  Stripe actif) : on l'explique au lieu de l'ignorer. */}
              {Boolean(initialServiceId) &&
                !paidServices.some((s) => s.id === initialServiceId) && (
                  <div className="rounded-xl border border-border bg-bg-elevated p-3">
                    <p className="text-xs text-text-muted">
                      {t("booking.unpayableService")}
                    </p>
                  </div>
                )}

              {/* Abonnement mensuel : pas de créneau, le coach planifie */}
              {isSubscription && (
                <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
                  <p className="text-xs font-medium text-text-base">
                    <RepeatIcon size={13} className="mr-1.5 inline-block align-[-2px] text-accent" />{t("booking.subscriptionTitle")}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t("booking.subscriptionDesc")}
                  </p>
                </div>
              )}

              {/* Présentiel / visio si le coach propose les deux */}
              {!isSubscription && coach.accepts_online && coach.city && (
                <div className="flex gap-2">
                  {[false, true].map((opt) => (
                    <button
                      key={String(opt)}
                      type="button"
                      aria-pressed={online === opt}
                      onClick={() => setOnline(opt)}
                      className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        online === opt
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border-strong text-text-muted hover:text-text-base"
                      }`}
                    >
                      {opt ? (
                        t("booking.online")
                      ) : (
                        <>
                          <MapPinIcon
                            size={13}
                            className="mr-1 inline-block align-[-2px]"
                          />
                          {coach.city}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Créneaux réels (pas pour un abonnement) ─────────────── */}
              {!isSubscription && slotState.mode === "loading" && (
                <div
                  role="status"
                  aria-busy={slotState.mode === "loading"}
                  className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-dim"
                >
                  {t("booking.slotsLoading")}
                </div>
              )}

              {/* Erreur de chargement : proposer de réessayer plutôt que de
                  laisser réserver à l'aveugle */}
              {!isSubscription && slotState.mode === "error" && (
                <div className="rounded-xl border border-border bg-bg-elevated p-4 text-center">
                  <p className="text-sm text-text-muted">
                    {t("booking.slotsError")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSlotRetry((n) => n + 1)}
                    className="mt-2 rounded-full border border-accent/40 px-4 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                  >
                    {t("booking.retry")}
                  </button>
                </div>
              )}

              {/* Retour de connexion : on confirme que la sélection a survécu */}
              {draftRestored && (
                <p className="rounded-xl border border-accent/25 bg-accent/[0.06] px-3.5 py-2.5 text-xs font-medium text-accent">
                  {t("booking.draftRestored")}
                </p>
              )}

              {!isSubscription && slotState.mode === "slots" && (
                <div className="flex flex-col gap-2">
                  <span className={labelClass}>{t("booking.chooseSlot")}</span>
                  {!anySlots ? (
                    <div className="rounded-xl border border-border bg-bg-elevated p-4 text-center">
                      <p className="text-sm text-text-muted">
                        {t("booking.noSlotsRange")}
                      </p>
                      {onContact && (
                        <button
                          type="button"
                          onClick={onContact}
                          className="mt-3 rounded-full border border-accent/40 px-4 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                        >
                          {t("booking.contactCoach")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Jours (14 prochains) */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {slotState.days.map((d, i) => {
                          const empty = d.slots.length === 0;
                          const active = i === dayIdx;
                          return (
                            <button
                              key={d.date}
                              type="button"
                              aria-pressed={active}
                              disabled={empty}
                              onClick={() => {
                                setDayIdx(i);
                                setSelectedIso(null);
                              }}
                              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                                active
                                  ? "border-accent bg-accent/10 text-accent"
                                  : empty
                                  ? "border-border text-text-dim opacity-40"
                                  : "border-border-strong text-text-muted hover:text-text-base"
                              }`}
                            >
                              {dayChipLabel(d.date)}
                            </button>
                          );
                        })}
                      </div>
                      {/* Heures du jour sélectionné */}
                      {currentDay && currentDay.slots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5">
                          {currentDay.slots.map((s) => (
                            <button
                              key={s.iso}
                              type="button"
                              aria-pressed={selectedIso === s.iso}
                              onClick={() => setSelectedIso(s.iso)}
                              className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                                selectedIso === s.iso
                                  ? "border-accent bg-accent text-black"
                                  : "border-border-strong text-text-base hover:border-accent/50"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-border bg-bg-elevated p-3 text-center text-xs text-text-dim">
                          {t("booking.noSlotsDay")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Saisie libre (coach sans disponibilités définies) ───── */}
              {!isSubscription && slotState.mode === "free" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{t("booking.date")}</span>
                      <input
                        type="date"
                        value={date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setDate(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{t("booking.time")}</span>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
                    </label>
                  </div>
                  <p className="text-xs text-text-dim">
                    {t("booking.freeHint")}
                  </p>
                </>
              )}

              {/* Durée : visible uniquement en demande libre (sans prestation) */}
              {!selectedService && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.duration")}</span>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass}>
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Séquestre : rassure le client au moment de payer (pas
                  d'escrow sur un abonnement récurrent) */}
              {payMode && !isSubscription && (
                <div className="rounded-xl border border-border bg-bg-elevated p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-text-base">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {instant
                      ? t("booking.escrowTitle")
                      : t("booking.authTitle")}
                  </p>
                  {/* Un seul message selon le mode : séquestre (instant) OU
                      empreinte (validation). Les deux ensemble sèment le
                      doute sur ce qui est réellement débité. */}
                  <p className="mt-1 text-xs text-text-muted">
                    {instant ? t("booking.escrowDesc") : t("booking.authNote")}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-text-dim">
                    {t("cancellation.publicLabel")}
                  </p>
                  <PolicyTiers policy={resolveRefundPolicy(coach)} className="mt-1" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.firstName")}</span>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.lastName")}</span>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                </label>
              </div>

              {/* Email : celui du compte connecté. Non connecté, il viendra
                  de l'inscription au moment de payer. */}
              {Boolean(sessionEmail) && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.email")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly
                    className={`${inputClass} opacity-60`}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.phone")}</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.message")}</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t("booking.messagePlaceholder")} className={`${inputClass} resize-none`} />
              </label>

              {error && <p role="alert" className="text-sm text-danger">{error}</p>}

              <div className="mt-1 flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                  {t("booking.cancel")}
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading
                    ? payMode
                      ? t("booking.redirecting")
                      : t("booking.sending")
                    : isSubscription && selectedService
                    ? `${t("booking.subscribe")} ${formatPrice(selectedService.price_cents, selectedService.currency, locale)}${t("services.perMonth")}`
                    : payMode && selectedService && !instant
                    ? `${t("booking.reserve")} ${formatPrice(selectedService.price_cents, selectedService.currency, locale)}`
                    : payMode && selectedService
                    ? `${t("booking.pay")} ${formatPrice(selectedService.price_cents, selectedService.currency, locale)}`
                    : t("booking.submit")}
                </Button>
              </div>
              {/* Mode validation : rappel que rien n'est débité avant
                  l'acceptation, juste sous le bouton qui affiche un prix. */}
              {payMode && !isSubscription && !instant && (
                <p className="text-center text-[11px] text-text-dim">
                  {t("booking.chargedOnAccept")}
                </p>
              )}
              {/* Information précontractuelle (L.221-5 / L.221-28 12°) :
                  acceptation des CGV et de la charte, pas de rétractation
                  pour une séance à date déterminée. */}
              {payMode && (
                <p className="text-center text-[11px] leading-relaxed text-text-dim">
                  {t("booking.legalPrefix")}{" "}
                  <Link href="/cgv" target="_blank" className="underline hover:text-text-muted">
                    {t("booking.legalCgv")}
                  </Link>{" "}
                  {t("booking.legalAnd")}{" "}
                  <Link href="/charte-paiement" target="_blank" className="underline hover:text-text-muted">
                    {t("booking.legalCharter")}
                  </Link>
                  {isSubscription ? "" : ` ${t("booking.legalNoWithdrawal")}`}
                </p>
              )}
            </form>
          </>
        )}
    </Dialog>
  );
}
