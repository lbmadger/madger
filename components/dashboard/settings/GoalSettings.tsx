"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Réglage de l'objectif mensuel (revenus, séances) : LE formulaire vit ici,
// le dashboard n'affiche que les jauges. Champs vides = pas d'objectif.
export default function GoalSettings({
  coachId,
  initialRevenueCents,
  initialSessions,
}: {
  coachId: string;
  initialRevenueCents: number | null;
  initialSessions: number | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [revenueInput, setRevenueInput] = useState(
    initialRevenueCents != null ? String(Math.round(initialRevenueCents / 100)) : ""
  );
  const [sessionsInput, setSessionsInput] = useState(
    initialSessions != null ? String(initialSessions) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
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
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("goal.revenueLabel")} (€)</span>
          <input
            type="number"
            min={0}
            value={revenueInput}
            onChange={(e) => setRevenueInput(e.target.value)}
            placeholder="1500"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("goal.sessionsLabel")}</span>
          <input
            type="number"
            min={0}
            value={sessionsInput}
            onChange={(e) => setSessionsInput(e.target.value)}
            placeholder="30"
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="self-start">
          {saving ? t("goal.saving") : t("goal.save")}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-accent">
            {t("goal.saved")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t("goal.error")}
          </p>
        )}
      </div>
    </div>
  );
}
