"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Bouton "Gérer mon abonnement" → ouvre le portail de facturation Stripe.
// Affiché seulement si le coach a un abonnement Pro (stripe_customer_id).
export default function ManageSubscription() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent disabled:opacity-60"
    >
      {loading ? t("plans.opening") : t("plans.manage")}
    </button>
  );
}
