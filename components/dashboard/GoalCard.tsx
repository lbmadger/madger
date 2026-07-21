"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PencilIcon } from "@/components/ui/icons";

// Objectif du mois : jauges revenus et séances vs objectifs fixés par le
// coach, éditables sur place. Le suivi d'objectif est un moteur de motivation
// (même mécanique que les anneaux d'activité) : l'écart restant est affiché
// en positif (« reste 260 € »), jamais en reproche.

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
  coachId,
  monthLabel,
  revenueCents,
  sessionsCount,
  revenueGoalCents,
  sessionsGoal,
  locale,
}: {
  coachId: string;
  monthLabel: string;
  revenueCents: number;
  sessionsCount: number;
  revenueGoalCents: number | null;
  sessionsGoal: number | null;
  locale: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [revenueInput, setRevenueInput] = useState(
    revenueGoalCents != null ? String(Math.round(revenueGoalCents / 100)) : ""
  );
  const [sessionsInput, setSessionsInput] = useState(
    sessionsGoal != null ? String(sessionsGoal) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  async function save() {
    setSaving(true);
    setError(false);
    try {
      const revenue = revenueInput.trim() ? Number(revenueInput) : null;
      const sessions = sessionsInput.trim() ? Number(sessionsInput) : null;
      if (
        (revenue != null && (!Number.isFinite(revenue) || revenue < 0)) ||
        (sessions != null && (!Number.isFinite(sessions) || sessions < 0))
      ) {
        setError(true);
        return;
      }
      const supabase = createClient();
      const { error: err } = await supabase
        .from("coaches")
        .update({
          monthly_revenue_goal_cents:
            revenue != null ? Math.round(revenue * 100) : null,
          monthly_sessions_goal: sessions != null ? Math.round(sessions) : null,
        })
        .eq("id", coachId);
      if (err) {
        setError(true);
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const hasGoal = revenueGoalCents != null || sessionsGoal != null;
  const revenuePct =
    revenueGoalCents && revenueGoalCents > 0
      ? Math.round((revenueCents / revenueGoalCents) * 100)
      : 0;

  return (
    <section className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold capitalize text-text-base">
          {t("goal.title")} {monthLabel}
        </h3>
        {hasGoal && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("goal.edit")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <PencilIcon size={12} />
          </button>
        )}
      </div>

      {editing || !hasGoal ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {!hasGoal && !editing && (
            <p className="text-sm text-text-muted">{t("goal.emptyDesc")}</p>
          )}
          {(editing || !hasGoal) && (
            <>
              <label className="flex items-center justify-between gap-3 text-sm text-text-muted">
                {t("goal.revenueLabel")}
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={revenueInput}
                    onChange={(e) => setRevenueInput(e.target.value)}
                    placeholder="1500"
                    className="w-24 rounded-lg border border-border-strong bg-white/[0.03] px-2.5 py-1.5 text-right text-sm text-text-base outline-none focus:border-accent"
                  />
                  <span className="text-text-dim">€</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-text-muted">
                {t("goal.sessionsLabel")}
                <input
                  type="number"
                  min={0}
                  value={sessionsInput}
                  onChange={(e) => setSessionsInput(e.target.value)}
                  placeholder="30"
                  className="w-24 rounded-lg border border-border-strong bg-white/[0.03] px-2.5 py-1.5 text-right text-sm text-text-base outline-none focus:border-accent"
                />
              </label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? t("goal.saving") : t("goal.save")}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-xs font-medium text-text-dim hover:text-text-muted"
                  >
                    {t("common.cancel")}
                  </button>
                )}
              </div>
              {error && (
                <p role="alert" className="text-xs text-danger">
                  {t("goal.error")}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
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
      )}
    </section>
  );
}
