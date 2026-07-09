"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RefundPolicy } from "@/lib/booking/cancellation";

// Résumé d'annulation façon Airbnb, affiché au moment de réserver/payer.
// Concret et daté quand le créneau est choisi : « Annulation gratuite jusqu'au
// mercredi 12 juin à 14:00. Ensuite, remboursement de 50 %. » Le point de
// bascule = 24 h avant le début de la séance. Framing côté client (ce qu'il
// récupère), comme Airbnb côté voyageur.
export default function CancellationSummary({
  policy,
  startsAt,
  locale,
}: {
  policy: RefundPolicy;
  // Début de la séance choisie (null pour un abonnement / sans créneau).
  startsAt?: Date | null;
  locale: string;
}) {
  const { t } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const free = policy.overPct >= 100;

  const cutoff = startsAt
    ? new Date(startsAt.getTime() - 24 * 3_600_000)
    : null;
  const cutoffLabel = cutoff
    ? cutoff.toLocaleString(loc, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
        {t("cancellation.summaryTitle")}
      </p>
      {free ? (
        <>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-text-base">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-accent"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>
              {cutoffLabel
                ? `${t("cancellation.freeUntil")} ${cutoffLabel}`
                : t("cancellation.freeOver24")}
            </span>
          </p>
          <p className="mt-1 pl-[1.4rem] text-xs text-text-muted">
            {policy.underPct > 0
              ? `${t("cancellation.afterRefund")} ${policy.underPct} %.`
              : `${t("cancellation.afterNoRefund")}.`}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-text-muted">
          {t("cancellation.moreThan24")} : {policy.overPct} %.{" "}
          {t("cancellation.lessThan24")} : {policy.underPct} %.
        </p>
      )}
    </div>
  );
}
