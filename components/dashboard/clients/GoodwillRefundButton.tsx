"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useConfirm } from "@/components/ui/useConfirm";

// Geste commercial sur une séance à l'unité : le coach rembourse au client
// ce qui a été conservé. Confirmation obligatoire, l'argent bouge pour de
// bon. `transferred` : les fonds ont déjà été versés au coach, la part versée
// est reprise sur son solde Stripe.
export default function GoodwillRefundButton({
  bookingId,
  amountCents,
  payoutCents,
  transferred,
}: {
  bookingId: string;
  amountCents: number;
  payoutCents: number;
  transferred: boolean;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const euros = (c: number) => (c / 100).toLocaleString(loc, { style: "currency", currency: "EUR" });

  async function run() {
    const ok = await confirm({
      title: t("clients.detail.gestureTitle"),
      message: `${t("clients.detail.gestureDesc").replace("{amount}", euros(amountCents))} ${
        transferred
          ? t("clients.detail.gestureSourcePaid").replace("{reversal}", euros(Math.min(amountCents, payoutCents)))
          : t("clients.detail.gestureSourceHeld")
      }`,
      confirmLabel: t("clients.detail.gestureConfirm"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/goodwill-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      if (!res.ok) {
        setError(t("clients.detail.gestureErr"));
        return;
      }
      setMsg(t("clients.detail.gestureDone").replace("{amount}", euros(amountCents)));
      router.refresh();
    } catch {
      setError(t("clients.detail.gestureErr"));
    } finally {
      setBusy(false);
    }
  }

  if (msg) return <span className="shrink-0 text-[11px] font-medium text-accent">{msg}</span>;
  return (
    <>
      {dialog}
      <span className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("clients.detail.gestureBtn").replace("{amount}", euros(amountCents))}
        </button>
        {error && <span className="text-[11px] text-danger">{error}</span>}
      </span>
    </>
  );
}
