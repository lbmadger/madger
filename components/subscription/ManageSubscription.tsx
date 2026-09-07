"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

// « Gérer mon abonnement ». La mise à jour de carte et les factures ouvrent
// le portail Stripe. La RÉSILIATION se fait dans l'app, en étapes claires :
//  1. pourquoi tu pars (raison, journalisée),
//  2. une réponse à cette raison (bascule annuelle, 1 mois offert, contact),
//  3. « tu es sûr ? » avec ce que tu perds, bouton principal = rester,
//  4. arrêt à la fin de la période payée, réactivable d'un clic.
// Les libellés disent toujours ce que fait le bouton : on retient avec de
// vrais arguments, jamais avec un bouton trompeur (loi résiliation en trois
// clics, interdiction des interfaces trompeuses).
const REASONS = [
  "too_expensive",
  "not_enough_revenue",
  "missing_features",
  "other_tool",
  "pause",
  "other",
] as const;
type Reason = (typeof REASONS)[number];

export default function ManageSubscription({
  savedStr,
  plan,
  canceling = false,
  cancelAtStr = null,
  offerAvailable = false,
}: {
  // Commission évitée sur 90 jours grâce à Pro, déjà formatée ("124,50 €"),
  // ou null si rien d'encaissé.
  savedStr?: string | null;
  // Plan actuel ("monthly" | "annual" | null) : la bascule annuelle n'est
  // proposée qu'aux mensuels.
  plan?: string | null;
  // Arrêt déjà programmé en fin de période (réactivable).
  canceling?: boolean;
  cancelAtStr?: string | null;
  // Geste de rétention (1 mois offert) encore disponible.
  offerAvailable?: boolean;
}) {
  const { t, dict, locale } = useI18n();
  const r = dict.plans.retain;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "reason" | "offer" | "confirm" | "done">("menu");
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<"switched" | "offer" | "cancelled" | "resumed" | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  async function call(path: string, body?: unknown): Promise<Record<string, unknown> | null> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? (data as Record<string, unknown>) : null;
  }

  async function openPortal() {
    setLoading("portal");
    setError(false);
    const data = await call("/api/stripe/portal");
    if (data?.url) {
      window.location.href = String(data.url);
      return;
    }
    setError(true);
    setLoading(null);
  }

  async function switchAnnual() {
    setLoading("annual");
    setError(false);
    const ok = await call("/api/stripe/switch-annual");
    if (ok) {
      setResult("switched");
      setStep("done");
      router.refresh();
    } else setError(true);
    setLoading(null);
  }

  async function acceptOffer() {
    setLoading("offer");
    setError(false);
    const ok = await call("/api/stripe/retention-offer", { reason, details });
    if (ok) {
      setResult("offer");
      setStep("done");
      router.refresh();
    } else setError(true);
    setLoading(null);
  }

  async function cancelNow() {
    setLoading("cancel");
    setError(false);
    const data = await call("/api/stripe/cancel", { reason, details });
    if (data) {
      setEndsAt((data.ends_at as string | null) ?? null);
      setResult("cancelled");
      setStep("done");
      router.refresh();
    } else setError(true);
    setLoading(null);
  }

  async function resume() {
    setLoading("resume");
    setError(false);
    const ok = await call("/api/stripe/resume");
    if (ok) {
      setResult("resumed");
      setStep("done");
      setOpen(true);
      router.refresh();
    } else setError(true);
    setLoading(null);
  }

  function close() {
    setOpen(false);
    setStep("menu");
    setReason(null);
    setDetails("");
    setError(false);
    setResult(null);
  }

  const fmtEnds = endsAt
    ? new Date(endsAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : cancelAtStr ?? "";

  // Réponse ciblée à la raison donnée.
  function offerBlock() {
    const showAnnual = plan !== "annual" && (reason === "too_expensive" || reason === "not_enough_revenue");
    return (
      <>
        <h2 className="text-lg font-bold text-text-base">{r.offerTitle}</h2>
        <p className="mt-2 text-sm text-text-muted">
          {reason ? r.offerIntro[reason] : r.intro}
        </p>
        {savedStr && (
          <p className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm text-text-base">
            <strong className="font-bold text-accent">{savedStr}</strong> {r.savedLine}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          {offerAvailable && (
            <Button onClick={acceptOffer} disabled={loading !== null} className="w-full">
              {loading === "offer" ? r.switching : r.offerMonth}
            </Button>
          )}
          {showAnnual && (
            <Button
              variant={offerAvailable ? "secondary" : "primary"}
              onClick={switchAnnual}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "annual" ? r.switching : r.switchAnnual}
            </Button>
          )}
          <a
            href={`mailto:contact@madger.app?subject=${encodeURIComponent("Mon abonnement Pro")}`}
            className="rounded-full border border-border-strong px-4 py-2.5 text-center text-sm font-medium text-text-base transition-colors hover:border-accent"
          >
            {r.talk}
          </a>
        </div>
        {offerAvailable && (
          <p className="mt-2 text-center text-[11px] text-text-dim">{r.offerMonthDesc}</p>
        )}
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="mt-4 w-full text-center text-xs text-text-dim underline transition-colors hover:text-text-muted"
        >
          {r.proceedCancel}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canceling ? (
          <Button onClick={resume} disabled={loading !== null}>
            {loading === "resume" ? r.switching : r.resume}
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent"
        >
          {t("plans.manage")}
        </button>
      </div>
      {canceling && cancelAtStr && (
        <p className="mt-2 text-xs text-text-muted">
          {r.cancelingLine} <span className="font-semibold text-text-base">{cancelAtStr}</span>. {r.cancelingHint}
        </p>
      )}
      {error && !open && (
        <p role="alert" className="mt-2 text-sm text-danger">{r.error}</p>
      )}

      {open && (
        <Dialog onClose={close} label={t("plans.manage")} className="w-full max-w-md rounded-t-2xl border border-border bg-bg-card sm:rounded-2xl">
          <div className="p-6">
            {step === "menu" && (
              <>
                <h2 className="text-lg font-bold text-text-base">{t("plans.manage")}</h2>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={loading !== null}
                    className="rounded-xl border border-border-strong px-4 py-3 text-left text-sm font-medium text-text-base transition-colors hover:border-accent disabled:opacity-60"
                  >
                    {loading === "portal" ? t("plans.opening") : t("plans.manageBilling")}
                    <span className="mt-0.5 block text-xs font-normal text-text-dim">
                      {t("plans.manageBillingDesc")}
                    </span>
                  </button>
                  {!canceling && (
                    <button
                      type="button"
                      onClick={() => setStep("reason")}
                      className="rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-text-muted transition-colors hover:border-border-strong"
                    >
                      {t("plans.manageCancel")}
                      <span className="mt-0.5 block text-xs font-normal text-text-dim">
                        {t("plans.manageCancelDesc")}
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}

            {step === "reason" && (
              <>
                <h2 className="text-lg font-bold text-text-base">{r.reasonTitle}</h2>
                <p className="mt-1 text-sm text-text-muted">{r.reasonIntro}</p>
                <div className="mt-4 flex flex-col gap-1.5">
                  {REASONS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={reason === k}
                      onClick={() => setReason(k)}
                      className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                        reason === k
                          ? "border-accent bg-accent/[0.08] text-text-base"
                          : "border-border text-text-muted hover:border-border-strong"
                      }`}
                    >
                      {r.reasons[k]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder={r.detailsPlaceholder}
                  className="mt-3 w-full resize-none rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm text-text-base placeholder:text-text-dim focus:border-accent focus:outline-none"
                />
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={close} className="flex-1">
                    {r.stay}
                  </Button>
                  <Button
                    onClick={() => setStep("offer")}
                    disabled={!reason}
                    className="flex-1"
                  >
                    {r.next}
                  </Button>
                </div>
              </>
            )}

            {step === "offer" && offerBlock()}

            {step === "confirm" && (
              <>
                <h2 className="text-lg font-bold text-text-base">{r.confirmTitle}</h2>
                <p className="mt-2 text-sm text-text-muted">{r.confirmIntro}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {r.confirmLoss.map((l) => (
                    <li key={l} className="rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm text-text-muted">
                      {l}
                    </li>
                  ))}
                </ul>
                <Button onClick={close} className="mt-5 w-full">
                  {r.keep}
                </Button>
                <button
                  type="button"
                  onClick={cancelNow}
                  disabled={loading !== null}
                  className="mt-3 w-full rounded-full border border-border px-4 py-2 text-center text-xs font-medium text-text-dim transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-60"
                >
                  {loading === "cancel" ? r.cancelling : r.cancelAnyway}
                </button>
              </>
            )}

            {step === "done" && (
              <>
                <h2 className="text-lg font-bold text-text-base">
                  {result === "switched"
                    ? r.switchedTitle
                    : result === "offer"
                    ? r.offerDoneTitle
                    : result === "resumed"
                    ? r.resumedTitle
                    : r.cancelledTitle}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  {result === "switched"
                    ? r.switchedDesc
                    : result === "offer"
                    ? r.offerDoneDesc
                    : result === "resumed"
                    ? r.resumedDesc
                    : r.cancelledDesc.replace("{date}", fmtEnds)}
                </p>
                <Button onClick={close} className="mt-5 w-full">
                  {r.switchedCta}
                </Button>
              </>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">{r.error}</p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
