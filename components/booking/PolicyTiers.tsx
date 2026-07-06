"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { policyTiers, type CancellationPolicy } from "@/lib/booking/cancellation";

// Paliers de remboursement d'une politique d'annulation, calculés depuis la
// source de vérité (lib/booking/cancellation). Deux lignes nettes : avant /
// après la frontière des 24 h, avec le pourcentage bien visible à droite.
// Réutilisé côté coach (réglages), profil public et modale de réservation.
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
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
        {t("cancellation.tiersTitle")}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {tiers.map((tier, i) => {
          const pct = Math.round(tier.refund * 100);
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-2.5 py-2 text-xs"
            >
              <span className="text-text-muted">
                {i === 0
                  ? t("cancellation.tierEarly")
                  : t("cancellation.tierLate")}
              </span>
              <span
                className={`shrink-0 font-bold tabular-nums ${
                  pct > 0 ? "text-accent" : "text-text-dim"
                }`}
              >
                {pct} %
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[11px] text-text-dim">
        {t("cancellation.noShow")}
      </p>
    </div>
  );
}
