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
}: {
  packId: string;
  remaining: number;
  events: CreditEvent[];
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

  return (
    <div className="mt-3 border-t border-border pt-2.5">
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
