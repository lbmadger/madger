"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PromoCode from "@/components/subscription/PromoCode";
import {
  launchOfferActive,
  launchOfferDaysLeft,
  currentMonthlyCents,
  currentAnnualCents,
  euros,
} from "@/lib/subscription/offer";
import LaunchPrice from "@/components/subscription/LaunchPrice";

// Cartes d'offres Free / Pro, réutilisées à l'onboarding et sur la page
// Abonnement. `currentPlan` met en avant l'offre active. Le bouton Pro lance
// le paiement d'abonnement Stripe (mensuel ou annuel).
export default function PricingPlans({
  currentPlan,
  trialEligible = true,
}: {
  currentPlan: "free" | "pro";
  // Premier abonnement : 7 jours d'essai, rien débité, puis renouvellement
  // automatique (migration 0062). Faux si l'essai a déjà été consommé.
  trialEligible?: boolean;
}) {
  const { t, dict, locale } = useI18n();
  const p = dict.plans;
  // Annuel par défaut : c'est la meilleure offre (2 mois offerts), autant
  // qu'elle soit visible sans clic.
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: period }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.client_secret) {
        // Paiement EMBARQUÉ : le formulaire Stripe s'affiche sur /paiement.
        window.location.href = `/paiement?cs=${encodeURIComponent(data.client_secret)}&back=${encodeURIComponent("/dashboard/abonnement")}`;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(t("plans.upgradeError"));
    } catch {
      setError(t("plans.upgradeError"));
    } finally {
      setLoading(false);
    }
  }

  const Feature = ({ label }: { label: string }) => (
    <li className="flex items-start gap-2 text-sm text-text-muted">
      <svg className="mt-0.5 shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {label}
    </li>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Free */}
      <div
        className={`rounded-2xl border p-5 ${
          currentPlan === "free"
            ? "border-accent/40 bg-accent/[0.04]"
            : "border-border bg-bg-card"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-base">{p.free}</h3>
          {currentPlan === "free" && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-black">
              {p.currentBadge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{p.freeDesc}</p>
        <p className="mt-3 text-2xl font-extrabold text-text-base">
          {p.priceFree}
          <span className="text-sm font-medium text-text-muted"> {p.perMonth}</span>
        </p>
        {/* Frais de transaction du plan, tout compris : la seule mention de
            frais, sans comparaison entre plans. */}
        <p className="mt-1 text-sm text-text-base">{p.feesFree}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {p.featuresFree.map((f) => (
            <Feature key={f} label={f} />
          ))}
        </ul>
      </div>

      {/* Pro */}
      <div
        className={`relative rounded-2xl border p-5 ${
          currentPlan === "pro"
            ? "border-accent/40 bg-accent/[0.04]"
            : "border-accent/25 bg-bg-card"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-accent">{p.pro}</h3>
          {currentPlan === "pro" && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-black">
              {p.currentBadge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{p.proDesc}</p>

        {/* Sélecteur mensuel / annuel */}
        <div className="mt-3 inline-flex rounded-full border border-border-strong p-0.5">
          {(["monthly", "annual"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={period === opt}
              onClick={() => setPeriod(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === opt
                  ? "bg-accent text-black"
                  : "text-text-muted hover:text-text-base"
              }`}
            >
              {opt === "monthly" ? p.billingMonthly : p.billingAnnual}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-2">
          <LaunchPrice
            period={period}
            locale={locale}
            suffix={period === "annual" ? p.perYear : p.perMonth}
            fromLabel={p.offerFrom}
          />
          {period === "annual" && (
            <span className="mt-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {p.annualSave}
            </span>
          )}
        </div>
        {period === "annual" && (
          <p className="mt-1 text-xs text-text-muted">{p.annualMonthlyEq.replace("{price}", euros(Math.round(currentAnnualCents() / 12), locale))}</p>
        )}
        {/* Offre de lancement : le tarif à venir est barré à côté du prix,
            avec sa date. Compte à rebours réel, prix bloqué tant que le coach
            reste abonné. */}
        {launchOfferActive() && (
          <p className="mt-2 rounded-xl border border-accent/25 bg-accent/[0.06] px-3 py-2 text-xs leading-relaxed text-text-base">
            <span className="font-bold text-accent">
              {launchOfferDaysLeft() <= 1
                ? p.offerLastDay
                : p.offerDaysLeft.replace("{n}", String(launchOfferDaysLeft()))}
            </span>{" "}
            {p.offerLocked}
          </p>
        )}
        <p className="mt-1 text-sm text-text-base">{p.feesPro}</p>
        <p className="mt-1 text-xs text-text-dim">{p.proNote}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {p.featuresPro.map((f) => (
            <Feature key={f} label={f} />
          ))}
        </ul>

        {currentPlan === "free" && (
          <>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? t("plans.upgrading")
                : trialEligible
                ? t("plans.trialButton")
                : t("plans.upgrade")}
            </button>
            {/* Le seul argument chiffré autorisé sous le bouton Pro. */}
            <p className="mt-2 text-center text-xs font-semibold text-accent">
              {p.proNoShow}
            </p>
            {trialEligible && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-text-dim">
                {(period === "annual" ? p.trialNoteAnnual : p.trialNoteMonthly).replace(
                  "{price}",
                  euros(period === "annual" ? currentAnnualCents() : currentMonthlyCents(), locale)
                )}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-center text-sm text-danger">{error}</p>
            )}
            {/* Code d'accès anticipé : proposé UNIQUEMENT ici, dans la carte
                Madger Pro (c'est un code qui offre 1 mois de Pro). */}
            <div className="mt-3">
              <PromoCode compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
