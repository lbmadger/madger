"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";

// Démarre la connexion Stripe : appelle l'API qui renvoie un lien d'onboarding
// Stripe, puis redirige le coach vers ce lien.
export default function StripeConnectButton({ label }: { label: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  return (
    <Button onClick={go} disabled={loading}>
      {loading ? t("payments.connecting") : label}
    </Button>
  );
}
