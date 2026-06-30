"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import BookingModal from "./BookingModal";
import {
  type PublicCoach,
  coachFullName,
  coachInitials,
} from "@/lib/coaches/public-types";
import { type PublicService, formatPrice } from "@/lib/services/types";

// Profil public d'un coach (page madger.app/<slug>). Les CTA Réserver /
// Contacter seront branchés à l'étape suivante (réservation + messagerie).
export default function CoachProfile({
  coach,
  services = [],
}: {
  coach: PublicCoach;
  services?: PublicService[];
}) {
  const { t, locale } = useI18n();
  const [booking, setBooking] = useState(false);

  function priceLine(s: PublicService): string {
    const base = formatPrice(s.price_cents, s.currency, locale);
    return s.type === "subscription" ? `${base}${t("services.perMonth")}` : base;
  }

  function metaLine(s: PublicService): string {
    const parts: string[] = [t(`services.types.${s.type}`)];
    if (s.type === "pack" && s.pack_size)
      parts.push(`${s.pack_size} ${t("services.sessionsLabel")}`);
    if (s.duration_min) parts.push(`${s.duration_min} min`);
    return parts.join(" · ");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/coachs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t("coachProfile.backToSearch")}
      </Link>

      <div className="rounded-2xl border border-border bg-bg-card p-6 sm:p-8">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent">
            {coachInitials(coach)}
          </span>
          <div className="mt-4 sm:ml-5 sm:mt-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
              {coachFullName(coach)}
            </h1>
            {coach.specialty && (
              <p className="mt-1 text-sm text-text-muted">{coach.specialty}</p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {coach.city && (
                <span className="rounded-full border border-border-strong px-2.5 py-1 text-xs text-text-muted">
                  📍 {coach.city}
                </span>
              )}
              {coach.accepts_online && (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  {t("coachProfile.onlineAvailable")}
                </span>
              )}
            </div>
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
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-base">
                      {s.name}
                    </p>
                    <p className="text-xs text-text-muted">{metaLine(s)}</p>
                  </div>
                  <span className="shrink-0 font-bold text-accent">
                    {priceLine(s)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => setBooking(true)}>
            {t("coachProfile.book")}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setBooking(true)}
          >
            {t("coachProfile.contact")}
          </Button>
        </div>
      </div>

      {booking && (
        <BookingModal coach={coach} onClose={() => setBooking(false)} />
      )}
    </main>
  );
}
