"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

// « Gérer mon abonnement » : la mise à jour de carte et les factures ouvrent
// directement le portail Stripe. La RÉSILIATION passe d'abord par un écran
// de rétention : rappel chiffré de ce que Pro rapporte, bascule vers
// l'annuel (2 mois offerts) en un clic, contact direct. Le portail (où se
// trouve le bouton résilier) n'arrive qu'en dernier recours, en petit.
export default function ManageSubscription({
  savedStr,
  plan,
}: {
  // Commission évitée sur 90 jours grâce à Pro, déjà formatée ("124,50 €"),
  // ou null si rien d'encaissé.
  savedStr?: string | null;
  // Plan actuel ("monthly" | "annual" | null) : la bascule annuelle n'est
  // proposée qu'aux mensuels.
  plan?: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "retain">("menu");
  const [loading, setLoading] = useState<"portal" | "annual" | null>(null);
  const [error, setError] = useState(false);
  const [switched, setSwitched] = useState(false);

  async function openPortal() {
    setLoading("portal");
    setError(false);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setLoading(null);
  }

  async function switchAnnual() {
    setLoading("annual");
    setError(false);
    try {
      const res = await fetch("/api/stripe/switch-annual", { method: "POST" });
      if (res.ok) {
        setSwitched(true);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(null);
  }

  function close() {
    setOpen(false);
    setStep("menu");
    setError(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent"
      >
        {t("plans.manage")}
      </button>

      {open && (
        <Dialog onClose={close} label={t("plans.manage")} className="max-w-md">
          <div className="p-6">
            {switched ? (
              <>
                <h2
                  id="manage-sub-title"
                  className="text-lg font-bold text-text-base"
                >
                  {t("plans.retain.switchedTitle")}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  {t("plans.retain.switchedDesc")}
                </p>
                <Button onClick={close} className="mt-5 w-full">
                  {t("plans.retain.switchedCta")}
                </Button>
              </>
            ) : step === "menu" ? (
              <>
                <h2
                  id="manage-sub-title"
                  className="text-lg font-bold text-text-base"
                >
                  {t("plans.manage")}
                </h2>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={loading !== null}
                    className="rounded-xl border border-border-strong px-4 py-3 text-left text-sm font-medium text-text-base transition-colors hover:border-accent disabled:opacity-60"
                  >
                    {loading === "portal"
                      ? t("plans.opening")
                      : t("plans.manageBilling")}
                    <span className="mt-0.5 block text-xs font-normal text-text-dim">
                      {t("plans.manageBillingDesc")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("retain")}
                    className="rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-text-muted transition-colors hover:border-border-strong"
                  >
                    {t("plans.manageCancel")}
                    <span className="mt-0.5 block text-xs font-normal text-text-dim">
                      {t("plans.manageCancelDesc")}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  id="manage-sub-title"
                  className="text-lg font-bold text-text-base"
                >
                  {t("plans.retain.title")}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  {t("plans.retain.intro")}
                </p>

                <ul className="mt-4 flex flex-col gap-2">
                  {savedStr && (
                    <li className="rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm text-text-base">
                      <strong className="font-bold text-accent">
                        {savedStr}
                      </strong>{" "}
                      {t("plans.retain.savedLine")}
                    </li>
                  )}
                  <li className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-text-muted">
                    {t("plans.retain.lossCommission")}
                  </li>
                  <li className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-text-muted">
                    {t("plans.retain.lossBadge")}
                  </li>
                </ul>

                <div className="mt-5 flex flex-col gap-2">
                  <Button onClick={close} className="w-full">
                    {t("plans.retain.stay")}
                  </Button>
                  {plan !== "annual" && (
                    <Button
                      variant="secondary"
                      onClick={switchAnnual}
                      disabled={loading !== null}
                      className="w-full"
                    >
                      {loading === "annual"
                        ? t("plans.retain.switching")
                        : t("plans.retain.switchAnnual")}
                    </Button>
                  )}
                  <a
                    href="mailto:contact@madger.app?subject=Mon%20abonnement%20Pro"
                    className="rounded-full border border-border-strong px-4 py-2.5 text-center text-sm font-medium text-text-base transition-colors hover:border-accent"
                  >
                    {t("plans.retain.talk")}
                  </a>
                </div>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {t("plans.retain.error")}
                  </p>
                )}

                <button
                  type="button"
                  onClick={openPortal}
                  disabled={loading !== null}
                  className="mt-4 w-full text-center text-xs text-text-dim underline transition-colors hover:text-text-muted disabled:opacity-60"
                >
                  {loading === "portal"
                    ? t("plans.opening")
                    : t("plans.retain.proceedCancel")}
                </button>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
