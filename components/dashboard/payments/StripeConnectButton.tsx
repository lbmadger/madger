"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";

// Démarre la connexion Stripe : appelle l'API qui renvoie un lien d'onboarding
// Stripe, puis redirige le coach vers ce lien. Échec = message clair (c'est
// l'étape la plus critique du parcours, pas question d'échouer en silence).
export default function StripeConnectButton({ label }: { label: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Détail technique renvoyé par le serveur (message Stripe) : sans lui,
  // impossible de diagnostiquer un échec de connexion à distance.
  const [detail, setDetail] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(false);
    setDetail(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(true);
      if (typeof data.detail === "string") setDetail(data.detail);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div>
      <Button onClick={go} disabled={loading}>
        {loading ? t("payments.connecting") : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t("payments.connectError")}
          {detail ? ` (${detail})` : ""}
        </p>
      )}
    </div>
  );
}
