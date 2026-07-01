"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Formulaire de signalement d'un problème sur une séance payée. Gèle les fonds
// (via /api/bookings/report) après vérification de l'email de la réservation.
export default function ReportProblem({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, email, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        return;
      }
      if (data.error === "email_mismatch") setError(t("cancellation.reportMismatch"));
      else if (data.error === "not_disputable") setError(t("cancellation.reportTooLate"));
      else setError(t("cancellation.reportError"));
    } catch {
      setError(t("cancellation.reportError"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-accent/20 bg-accent/[0.05] p-4 text-sm text-text-base">
        {t("cancellation.reportDone")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-text-muted underline-offset-2 hover:text-text-base hover:underline"
      >
        {t("cancellation.reportProblem")}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-4"
    >
      <p className="text-sm text-text-muted">{t("cancellation.reportDesc")}</p>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t("cancellation.reportEmail")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t("cancellation.reportReason")}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? t("cancellation.reportSending") : t("cancellation.reportSubmit")}
      </Button>
    </form>
  );
}
