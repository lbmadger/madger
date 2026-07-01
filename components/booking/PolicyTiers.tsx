"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { policyTiers, type CancellationPolicy } from "@/lib/booking/cancellation";

// Affiche les paliers de remboursement d'une politique d'annulation, calculés
// à partir de la source de vérité (lib/booking/cancellation). Réutilisé côté
// coach (réglages), profil public et modale de réservation.
export default function PolicyTiers({
  policy,
  className = "",
}: {
  policy: CancellationPolicy;
  className?: string;
}) {
  const { t } = useI18n();
  const tiers = policyTiers(policy);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <p className="text-xs text-text-dim">{t("cancellation.direction")}</p>
      <ul className="flex flex-col gap-1">
        {tiers.map((tier, i) => {
          const pct = Math.round(tier.refund * 100);
          const cond =
            i === 0
              ? `≥ ${tier.minHoursBefore} h`
              : `< ${tiers[i - 1].minHoursBefore} h`;
          return (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-text-muted">
                {t("cancellation.cancelWord")} {cond}{" "}
                {t("cancellation.beforeSession")}
              </span>
              <span
                className={`shrink-0 font-semibold ${
                  pct > 0 ? "text-accent" : "text-text-dim"
                }`}
              >
                {pct}% {t("cancellation.refunded")}
              </span>
            </li>
          );
        })}
        <li className="mt-0.5 text-xs text-text-dim">{t("cancellation.noShow")}</li>
      </ul>
    </div>
  );
}
