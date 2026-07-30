"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PencilIcon } from "@/components/ui/icons";

// Objectif du mois : jauges revenus et séances vs objectifs du coach.
// L'ÉDITION vit dans Réglages → Objectif du mois : ici on ne fait
// qu'afficher la progression (l'écart restant en positif, jamais en
// reproche). Sans objectif fixé : une invite discrète vers les réglages.

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#9DCC00] to-accent transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export default function GoalCard({
  monthLabel,
  revenueCents,
  sessionsCount,
  revenueGoalCents,
  sessionsGoal,
  locale,
}: {
  monthLabel: string;
  revenueCents: number;
  sessionsCount: number;
  revenueGoalCents: number | null;
  sessionsGoal: number | null;
  locale: string;
}) {
  const { t } = useI18n();

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  const hasGoal =
    (revenueGoalCents != null && revenueGoalCents > 0) ||
    (sessionsGoal != null && sessionsGoal > 0);
  const revenuePct =
    revenueGoalCents && revenueGoalCents > 0
      ? Math.round((revenueCents / revenueGoalCents) * 100)
      : 0;

  // Pas d'objectif : une ligne discrète, pas un formulaire au milieu du
  // dashboard.
  if (!hasGoal) {
    return (
      <Link
        href="/dashboard/reglages"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/40"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-base">
            {t("goal.title")} {monthLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {t("goal.emptyDesc")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted">
          {t("goal.cta")}
        </span>
      </Link>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold capitalize text-text-base">
          {t("goal.title")} {monthLabel}
        </h3>
        <Link
          href="/dashboard/reglages"
          aria-label={t("goal.edit")}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <PencilIcon size={12} />
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {revenueGoalCents != null && revenueGoalCents > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs text-text-muted">
                {t("goal.revenueLabel")}
              </span>
              <span className="text-sm font-semibold text-text-base">
                {euros(revenueCents)}{" "}
                <span className="font-normal text-text-dim">
                  / {euros(revenueGoalCents)}
                </span>
              </span>
            </div>
            <Bar pct={revenuePct} />
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="font-semibold text-accent">
                {Math.min(100, revenuePct)}% {t("goal.reached")}
              </span>
              <span className="text-text-dim">
                {revenueCents >= revenueGoalCents
                  ? t("goal.done")
                  : `${t("goal.remaining")} ${euros(revenueGoalCents - revenueCents)}`}
              </span>
            </div>
          </div>
        )}
        {sessionsGoal != null && sessionsGoal > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs text-text-muted">
                {t("goal.sessionsLabel")}
              </span>
              <span className="text-sm font-semibold text-text-base">
                {sessionsCount}{" "}
                <span className="font-normal text-text-dim">
                  / {sessionsGoal}
                </span>
              </span>
            </div>
            <Bar pct={(sessionsCount / sessionsGoal) * 100} />
          </div>
        )}
      </div>
    </section>
  );
}
