"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  bmi,
  bmiCategory,
  ageFromBirthDate,
  type ClientProfile,
} from "@/lib/health/bmi";

// Fiche sportive du client, repliable, affichée au-dessus du fil de discussion
// côté coach : âge, mesures, IMC, objectifs et niveau. Le coach sait à qui il
// a affaire avant même de répondre.
export default function ClientSheet({ profile }: { profile: ClientProfile }) {
  const { t } = useI18n();
  const value = bmi(Number(profile.weight_kg), Number(profile.height_cm));
  const age = ageFromBirthDate(profile.birth_date);

  const facts: string[] = [];
  if (age) facts.push(`${age} ${t("clientSheet.age")}`);
  if (profile.height_cm) facts.push(`${profile.height_cm} cm`);
  if (profile.weight_kg) facts.push(`${profile.weight_kg} kg`);

  const hasContent =
    facts.length > 0 || profile.goals.length > 0 || profile.level || profile.note;
  if (!hasContent) return null;

  return (
    <details className="group border-b border-border bg-bg-card/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-text-muted transition-colors hover:text-text-base [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="text-accent">📋</span>
          {t("clientSheet.title")}
          {value && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {t("clientSheet.bmi")} {value}
            </span>
          )}
        </span>
        <svg className="transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="flex flex-col gap-2.5 px-4 pb-3.5">
        {facts.length > 0 && (
          <p className="text-sm text-text-base">
            {facts.join(" · ")}
            {value && (
              <span className="ml-2 text-xs text-text-muted">
                {t("clientSheet.bmi")} {value} :{" "}
                {t(`clientOnboarding.bmi.${bmiCategory(value)}`)}
              </span>
            )}
          </p>
        )}

        {(profile.goals.length > 0 || profile.level) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.level && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-black">
                {t(`clientOnboarding.levels.${profile.level}`)}
              </span>
            )}
            {profile.goals.map((g) => (
              <span
                key={g}
                className="rounded-full border border-border-strong px-2.5 py-1 text-[11px] text-text-muted"
              >
                {t(`clientOnboarding.goals.${g}`)}
              </span>
            ))}
          </div>
        )}

        {profile.note && (
          <p className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs italic leading-relaxed text-text-muted">
            « {profile.note} »
          </p>
        )}
      </div>
    </details>
  );
}
