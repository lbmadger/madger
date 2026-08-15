"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Signaler un client à l'équipe Madger (fiche client). Discret : c'est un
// recours, pas une action du quotidien.
export default function ReportClientButton({ clientId }: { clientId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function report() {
    const reason = window.prompt(t("clients.reportPrompt"));
    if (reason === null) return;
    try {
      const res = await fetch("/api/clients/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, reason: reason.slice(0, 500) }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-6 text-center">
      {state === "sent" ? (
        <p className="text-xs text-text-dim">{t("clients.reportSent")}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={report}
            className="text-xs font-medium text-text-dim transition-colors hover:text-danger"
          >
            {t("clients.report")}
          </button>
          {state === "error" && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {t("clients.reportError")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
