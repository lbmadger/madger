"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

// Checklist d'onboarding affichée sur la vue d'ensemble tant que la config
// n'est pas terminée. Phase 0 : statique (toutes non cochées). En Phase 1+,
// chaque étape se cochera selon l'état réel du compte coach.

const STEPS = [
  "overview.setupProfile",
  "overview.setupAvailability",
  "overview.setupServices",
  "overview.setupStripe",
] as const;

export default function SetupChecklist() {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
      <h3 className="text-base font-semibold text-text-base">
        {t("overview.setupTitle")}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {t("overview.setupSubtitle")}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {STEPS.map((step) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-text-dim">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span className="text-sm text-text-muted">{t(step)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
