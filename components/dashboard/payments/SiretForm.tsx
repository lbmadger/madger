"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { inputClass } from "@/lib/ui/styles";

// Le SIRET conditionne l'encaissement (/api/stripe/checkout refuse sans lui,
// il figure sur les factures). Le réclamer ici, à côté de Stripe, évite que
// le coach le découvre via un client bloqué au paiement. Le champ vivait
// seulement au fond des Réglages : il reste là-bas aussi, même colonne.
export default function SiretForm({ coachId }: { coachId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [siret, setSiret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setError(false);
    const clean = siret.replace(/\s/g, "");
    if (!/^\d{14}$/.test(clean)) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("coaches")
        .update({ siret: clean })
        .eq("id", coachId);
      if (dbErr) {
        setError(true);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <section className="mt-4 rounded-2xl border border-accent/30 bg-accent/[0.05] px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-medium text-text-base">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-black">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          {t("payments.siretSaved")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-warning/30 bg-warning/[0.05] p-5">
      <h2 className="text-sm font-semibold text-text-base">
        {t("payments.siretTitle")}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        {t("payments.siretDesc")}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={siret}
          onChange={(e) => setSiret(e.target.value)}
          placeholder={t("payments.siretPlaceholder")}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "…" : t("payments.siretSave")}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t("payments.siretErr")}
        </p>
      )}
    </section>
  );
}
