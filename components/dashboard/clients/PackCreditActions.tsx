"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type CreditEvent = {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  actor: string;
  note: string | null;
  created_at: string;
};

// Geste commercial du coach sur un pack ACTIF : offrir ou retirer un
// crédit, avec une note. Passe par la fonction SQL coach_adjust_pack_credit
// (atomique, journalisée, jamais en dessous de zéro). Le journal des
// mouvements est affiché dessous.
export default function PackCreditActions({
  packId,
  remaining,
  events,
  refundable,
  request = null,
  refusedReason = null,
}: {
  packId: string;
  remaining: number;
  events: CreditEvent[];
  // Pack payé en ligne : le coach peut rembourser le reste (lot 2).
  refundable: boolean;
  // Demande de remboursement du client en attente (migration 0069) : le
  // coach a 7 jours pour accepter ou refuser avec motif.
  request?: { requested_at: string | null; note: string | null } | null;
  refusedReason?: string | null;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState<1 | -1>(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");

  async function refuse() {
    if (refuseReason.trim().length < 10) {
      setError(t("packActions.refuseReasonShort"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/packs/refuse-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId, reason: refuseReason.trim() }),
      });
      if (!res.ok) {
        setError(t("packActions.errGeneric"));
        return;
      }
      setRefuseOpen(false);
      setRefundMsg(t("packActions.refused"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function refundRest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/packs/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (j as { error?: string }).error === "nothing_refundable"
            ? t("packActions.refundNothing")
            : t("packActions.refundErr")
        );
        return;
      }
      setRefundOpen(false);
      setRefundMsg(
        t("packActions.refundDone").replace(
          "{amount}",
          (((j as { refunded_cents?: number }).refunded_cents ?? 0) / 100).toLocaleString(loc, {
            style: "currency",
            currency: "EUR",
          })
        )
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("coach_adjust_pack_credit", {
        p_pack: packId,
        p_delta: delta,
        p_note: note.trim() || null,
      });
      if (error) {
        setError(
          /credit_negative/.test(error.message)
            ? t("packActions.errNegative")
            : t("packActions.errGeneric")
        );
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const deadline = request?.requested_at
    ? new Date(new Date(request.requested_at).getTime() + 7 * 86400000)
    : null;

  return (
    <div className="mt-3 border-t border-border pt-2.5">
      {/* Demande du client : à traiter sous 7 jours, sinon remboursement
          automatique. */}
      {request && (
        <div className="mb-2 rounded-xl border border-warning/40 bg-warning/[0.08] p-3">
          <p className="text-xs font-semibold text-text-base">
            {t("packActions.requestBanner")
              .replace("{n}", String(remaining))
              .replace(
                "{date}",
                deadline
                  ? deadline.toLocaleDateString(loc, { day: "numeric", month: "long" })
                  : ""
              )}
          </p>
          {request.note && (
            <p className="mt-1 text-xs italic text-text-muted">« {request.note} »</p>
          )}
          <p className="mt-1 text-[11px] text-text-dim">{t("packActions.requestHint")}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRefuseOpen(false);
                setRefundOpen(true);
              }}
              className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
            >
              {t("packActions.accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRefundOpen(false);
                setRefuseOpen(true);
              }}
              className="flex-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
            >
              {t("packActions.refuse")}
            </button>
          </div>
        </div>
      )}
      {refusedReason && !request && (
        <p className="mb-2 text-[11px] text-text-dim">
          {t("packActions.refusedEarlier")} « {refusedReason} »
        </p>
      )}
      {refuseOpen && (
        <div className="mb-2 rounded-xl border border-border bg-bg-elevated p-3">
          <p className="text-xs font-semibold text-text-base">{t("packActions.refuseTitle")}</p>
          <p className="mt-1 text-xs text-text-muted">{t("packActions.refuseDesc")}</p>
          <textarea
            value={refuseReason}
            onChange={(e) => setRefuseReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("packActions.refusePlaceholder")}
            className="mt-2 w-full resize-none rounded-lg border border-border bg-bg-card px-3 py-2 text-xs text-text-base placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setRefuseOpen(false)}
              className="flex-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={refuse}
              className="flex-1 rounded-full bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/25 disabled:opacity-50"
            >
              {busy ? t("common.loading") : t("packActions.refuseSend")}
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setDelta(1);
            setOpen(true);
          }}
          className="rounded-full border border-accent/40 px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          {t("packActions.gift")}
        </button>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => {
              setDelta(-1);
              setOpen(true);
            }}
            className="rounded-full border border-border-strong px-3 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger"
          >
            {t("packActions.remove")}
          </button>
        )}
        {refundable && remaining > 0 && (
          <button
            type="button"
            onClick={() => setRefundOpen(true)}
            className="rounded-full border border-border-strong px-3 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-accent hover:text-text-base"
          >
            {t("packActions.refundRest")}
          </button>
        )}
        {events.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="ml-auto text-[11px] font-medium text-text-dim hover:text-text-base"
          >
            {showLog ? t("packActions.hideLog") : t("packActions.showLog")}
          </button>
        )}
      </div>

      {refundMsg && (
        <p role="status" className="mt-2 text-xs text-accent">
          {refundMsg}
        </p>
      )}

      {refundOpen && (
        <div className="mt-2 rounded-xl border border-warning/30 bg-warning/[0.06] p-3">
          <p className="text-xs font-semibold text-text-base">
            {t("packActions.refundTitle")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t("packActions.refundDesc").replace("{n}", String(remaining))}
          </p>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setRefundOpen(false)}
              className="flex-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={refundRest}
              className="flex-1 rounded-full bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/25 disabled:opacity-50"
            >
              {busy ? t("common.loading") : t("packActions.refundConfirm")}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-bg-elevated p-3">
          <p className="text-xs font-semibold text-text-base">
            {delta > 0 ? t("packActions.giftTitle") : t("packActions.removeTitle")}
          </p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("packActions.notePlaceholder")}
            maxLength={120}
            className="mt-2 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-xs text-text-base placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-muted"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={apply}
              className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
            >
              {busy ? t("common.loading") : t("packActions.apply")}
            </button>
          </div>
        </div>
      )}

      {showLog && events.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 text-[11px] text-text-muted"
            >
              <span className="min-w-0 truncate">
                {new Date(e.created_at).toLocaleDateString(loc, {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                · {t(`packActions.reasons.${e.reason}`)}
                {e.note ? ` · ${e.note}` : ""}
              </span>
              <span
                className={`shrink-0 font-semibold ${
                  e.delta > 0 ? "text-accent" : e.delta < 0 ? "text-danger" : "text-text-dim"
                }`}
              >
                {e.delta > 0 ? `+${e.delta}` : e.delta}
                <span className="ml-1 font-normal text-text-dim">
                  ({e.balance_after})
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
