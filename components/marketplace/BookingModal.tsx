"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import PolicyTiers from "@/components/booking/PolicyTiers";
import { inputClass, labelClass } from "@/lib/ui/styles";
import type { PublicCoach } from "@/lib/coaches/public-types";
import { type PublicService, formatPrice } from "@/lib/services/types";

const DURATIONS = [30, 45, 60, 90];

type Slot = { iso: string; label: string };
type SlotDay = { date: string; slots: Slot[] };
type SlotState =
  | { mode: "loading" }
  | { mode: "free" }
  | { mode: "slots"; days: SlotDay[] };

export default function BookingModal({
  coach,
  services = [],
  initialServiceId,
  onClose,
}: {
  coach: PublicCoach;
  services?: PublicService[];
  initialServiceId?: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const instant = coach.booking_mode === "instant";

  // Prestations payantes (paiement possible seulement si le coach encaisse).
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
  const [serviceId, setServiceId] = useState(
    initialServiceId && paidServices.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Créneaux réels (dispos du coach − séances déjà prises).
  const [slotState, setSlotState] = useState<SlotState>({ mode: "loading" });
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const selectedService = paidServices.find((s) => s.id === serviceId) ?? null;
  const payMode = !!selectedService;
  const effectiveDuration = selectedService?.duration_min ?? duration;

  // Charge les créneaux ; re-calcule si la durée change (prestation choisie).
  useEffect(() => {
    let alive = true;
    setSlotState({ mode: "loading" });
    setSelectedIso(null);
    fetch(`/api/slots?coach=${coach.slug}&duration=${effectiveDuration}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data.mode === "slots") {
          const days = data.days as SlotDay[];
          setSlotState({ mode: "slots", days });
          const first = days.findIndex((d) => d.slots.length > 0);
          setDayIdx(first === -1 ? 0 : first);
        } else {
          setSlotState({ mode: "free" });
        }
      })
      .catch(() => alive && setSlotState({ mode: "free" }));
    return () => {
      alive = false;
    };
  }, [coach.slug, effectiveDuration]);

  function dayChipLabel(dateISO: string): string {
    const d = new Date(dateISO + "T12:00:00");
    return d.toLocaleDateString(loc, { weekday: "short", day: "2-digit", month: "2-digit" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) return setError(t("booking.errors.nameRequired"));
    if (!email.trim()) return setError(t("booking.errors.emailRequired"));

    // Départ de séance : créneau choisi (mode slots) ou saisie libre.
    let starts: Date;
    if (slotState.mode === "slots") {
      if (!selectedIso) return setError(t("booking.errors.slotRequired"));
      starts = new Date(selectedIso);
    } else {
      if (!date || !time) return setError(t("booking.errors.dateRequired"));
      starts = new Date(`${date}T${time}`);
      if (starts.getTime() < Date.now())
        return setError(t("booking.errors.datePast"));
    }

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
            starts_at: starts.toISOString(),
            duration_min: effectiveDuration,
            online,
            message: message.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          window.location.href = data.url; // page de paiement Stripe
          return;
        }
        setError(t("booking.errors.generic"));
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
          starts_at: starts.toISOString(),
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
        else setError(t("booking.errors.generic"));
        return;
      }
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
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
              <Link href="/signup?role=client" className="w-full">
                <Button className="w-full">{t("booking.createAccount")}</Button>
              </Link>
              <Button variant="ghost" onClick={onClose}>
                {t("booking.cancel")}
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
                    <option value="">{t("booking.serviceNone")}</option>
                    {paidServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} —{" "}
                        {formatPrice(s.price_cents, s.currency, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Présentiel / visio si le coach propose les deux */}
              {coach.accepts_online && coach.city && (
                <div className="flex gap-2">
                  {[false, true].map((opt) => (
                    <button
                      key={String(opt)}
                      type="button"
                      onClick={() => setOnline(opt)}
                      className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        online === opt
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border-strong text-text-muted hover:text-text-base"
                      }`}
                    >
                      {opt ? t("booking.online") : `📍 ${coach.city}`}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Créneaux réels ──────────────────────────────────────── */}
              {slotState.mode === "loading" && (
                <div className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-dim">
                  {t("booking.slotsLoading")}
                </div>
              )}

              {slotState.mode === "slots" && (
                <div className="flex flex-col gap-2">
                  <span className={labelClass}>{t("booking.chooseSlot")}</span>
                  {!anySlots ? (
                    <p className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-muted">
                      {t("booking.noSlotsRange")}
                    </p>
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
              {slotState.mode === "free" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{t("booking.date")}</span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{t("booking.time")}</span>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
                    </label>
                  </div>
                </>
              )}

              {/* Durée : masquée si la prestation payante impose sa durée */}
              {!selectedService?.duration_min && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("booking.duration")}</span>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass}>
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Séquestre : rassure le client au moment de payer */}
              {payMode && (
                <div className="rounded-xl border border-border bg-bg-elevated p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-text-base">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {t("booking.escrowTitle")}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t("booking.escrowDesc")}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-text-dim">
                    {t("cancellation.publicLabel")}
                  </p>
                  <PolicyTiers policy={coach.cancellation_policy} className="mt-1" />
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

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.email")}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.phone")}</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.message")}</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t("booking.messagePlaceholder")} className={`${inputClass} resize-none`} />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="mt-1 flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                  {t("booking.cancel")}
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading
                    ? payMode
                      ? t("booking.redirecting")
                      : t("booking.sending")
                    : payMode && selectedService
                    ? `${t("booking.pay")} ${formatPrice(selectedService.price_cents, selectedService.currency, locale)}`
                    : t("booking.submit")}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
