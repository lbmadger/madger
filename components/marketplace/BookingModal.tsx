"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";
import type { PublicCoach } from "@/lib/coaches/public-types";

const DURATIONS = [30, 45, 60, 90];

export default function BookingModal({
  coach,
  onClose,
}: {
  coach: PublicCoach;
  onClose: () => void;
}) {
  const { t } = useI18n();

  // Coach sans ville mais dispo en ligne → réservation en visio par défaut.
  const [online, setOnline] = useState(!coach.city && coach.accepts_online);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) return setError(t("booking.errors.nameRequired"));
    if (!email.trim()) return setError(t("booking.errors.emailRequired"));
    if (!date || !time) return setError(t("booking.errors.dateRequired"));

    const starts = new Date(`${date}T${time}`);
    if (starts.getTime() < Date.now())
      return setError(t("booking.errors.datePast"));

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("request_booking", {
        coach_slug: coach.slug,
        client_first_name: firstName.trim(),
        client_last_name: lastName.trim() || null,
        client_email: email.trim(),
        client_phone: phone.trim() || null,
        starts_at: starts.toISOString(),
        duration_min: duration,
        message: message.trim() || null,
        online,
      });

      if (error) {
        const m = error.message || "";
        if (m.includes("date_in_past")) setError(t("booking.errors.datePast"));
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
              {t("booking.successTitle")}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
              {t("booking.successDesc")}
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
            <p className="mt-1 text-sm text-text-muted">{t("booking.desc")}</p>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
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

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("booking.duration")}</span>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </label>

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
                  {loading ? t("booking.sending") : t("booking.submit")}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
