"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Dispute = {
  id: string;
  amount_cents: number;
  currency: string;
  dispute_reason: string | null;
  disputed_at: string | null;
  coach_name: string;
  client_name: string;
  starts_at: string | null;
};

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

// Résolution d'un litige : l'admin fixe le montant remboursé au client, le reste
// (moins frais et commission) est versé au coach.
export default function DisputeResolver({ dispute }: { dispute: Dispute }) {
  const router = useRouter();
  const [refund, setRefund] = useState((dispute.amount_cents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(refundCents: number) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resolve-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: dispute.id, refund_cents: refundCents }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "error");
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-base">
            {euros(dispute.amount_cents)} · {dispute.client_name} →{" "}
            {dispute.coach_name}
          </p>
          {dispute.starts_at && (
            <p className="text-xs text-text-dim">
              {new Date(dispute.starts_at).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
          litige
        </span>
      </div>

      {dispute.dispute_reason && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-bg-elevated p-3 text-sm text-text-muted">
          {dispute.dispute_reason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => resolve(dispute.amount_cents)}
          className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base hover:border-accent disabled:opacity-50"
        >
          Rembourser le client (100 %)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => resolve(0)}
          className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base hover:border-accent disabled:opacity-50"
        >
          Verser au coach (0 %)
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            max={(dispute.amount_cents / 100).toString()}
            value={refund}
            onChange={(e) => setRefund(e.target.value)}
            className="w-24 rounded-lg border border-border-strong bg-white/[0.03] px-2 py-1.5 text-xs text-text-base outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => resolve(Math.round(parseFloat(refund || "0") * 100))}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
          >
            Rembourser ce montant
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
