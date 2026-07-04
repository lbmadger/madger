"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Checklist d'onboarding affichée tant que la config n'est pas terminée.
// Chaque étape est cliquable et reflète l'état réel du compte.
export default function SetupChecklist({
  profileDone = true,
  availabilityDone,
  servicesDone,
  stripeDone = false,
}: {
  profileDone?: boolean;
  availabilityDone: boolean;
  servicesDone: boolean;
  stripeDone?: boolean;
}) {
  const { t } = useI18n();

  const steps = [
    {
      labelKey: "overview.setupProfile",
      href: "/dashboard/reglages",
      done: profileDone,
    },
    {
      labelKey: "overview.setupAvailability",
      href: "/dashboard/disponibilites",
      done: availabilityDone,
    },
    {
      labelKey: "overview.setupServices",
      href: "/dashboard/prestations",
      done: servicesDone,
    },
    {
      labelKey: "overview.setupStripe",
      href: "/dashboard/paiements",
      done: stripeDone,
    },
  ];

  return (
    <section className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
      <h3 className="text-base font-semibold text-text-base">
        {t("overview.setupTitle")}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {t("overview.setupSubtitle")}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {steps.map((step) => {
          const inner = (
            <>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  step.done
                    ? "border-accent bg-accent text-black"
                    : "border-border-strong text-text-dim"
                }`}
              >
                {step.done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm ${step.done ? "text-text-dim line-through" : "text-text-base"}`}
              >
                {t(step.labelKey)}
              </span>
              {step.href && !step.done && (
                <svg className="ml-auto shrink-0 text-text-dim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </>
          );

          const base =
            "flex items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5";

          return (
            <li key={step.labelKey}>
              {step.href ? (
                <Link href={step.href} className={`${base} transition-colors hover:border-border-strong`}>
                  {inner}
                </Link>
              ) : (
                <div className={base}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
