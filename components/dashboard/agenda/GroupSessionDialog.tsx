"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Booking, GroupSession } from "@/lib/bookings/types";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";
import { useConfirm } from "@/components/ui/useConfirm";
import { formatPrice } from "@/lib/services/types";

// Fiche d'un cours collectif dans l'agenda : places, participants, lieu, et
// annulation du cours entier (remboursement intégral de chaque place).
export default function GroupSessionDialog({
  session,
  participants,
  onClose,
  onCancelled,
}: {
  session: GroupSession;
  // Places vivantes (pending / confirmed) de ce cours, client joint.
  participants: Booking[];
  onClose: () => void;
  onCancelled: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const { confirm, dialog } = useConfirm();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPast = new Date(session.ends_at).getTime() < Date.now();

  async function cancelSession() {
    const ok = await confirm({
      title: t("agenda.groupCancel"),
      message: t("agenda.groupCancelConfirm"),
      confirmLabel: t("agenda.groupCancel"),
      cancelLabel: t("agenda.cancelKeep"),
      danger: true,
    });
    if (!ok) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/group-sessions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_session_id: session.id }),
      });
      if (!res.ok) {
        setError(t("agenda.actionError"));
        return;
      }
      onCancelled(session.id);
    } catch {
      setError(t("agenda.actionError"));
    } finally {
      setCancelling(false);
    }
  }

  const name = (b: Booking) =>
    b.clients
      ? [b.clients.first_name, b.clients.last_name].filter(Boolean).join(" ")
      : "-";

  return (
    <>
      {dialog}
      <Dialog
        onClose={onClose}
        label={session.name}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-text-base">
              {session.name}
            </h2>
            <p className="mt-0.5 text-sm text-text-muted first-letter:uppercase">
              {new Date(session.starts_at).toLocaleString(loc, {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              {formatPrice(session.price_cents, session.currency, locale)}{" "}
              {t("agenda.groupPerPerson")}
            </p>
            {(session.location_text || (session.location === "online" && session.meeting_url)) && (
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {session.location === "online" ? session.meeting_url : session.location_text}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            {t("agenda.groupSeats")
              .replace("{n}", String(participants.length))
              .replace("{c}", String(session.capacity))}
          </span>
        </div>

        {session.notes && (
          <div className="mt-3 rounded-xl border border-border bg-bg-elevated p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              {t("agenda.noteLabel")}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-base">
              {session.notes}
            </p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
            {t("agenda.groupParticipants")}
          </p>
          {participants.length === 0 ? (
            <p className="mt-1.5 text-sm text-text-muted">{t("agenda.groupNone")}</p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {participants.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate text-text-base">{name(b)}</span>
                  {b.status === "pending" && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      {t("agenda.pending")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          {!isPast && (
            <button
              type="button"
              disabled={cancelling}
              onClick={cancelSession}
              className="w-full rounded-full border border-danger/40 py-2.5 text-sm font-medium text-danger transition-colors hover:border-danger disabled:opacity-50"
            >
              {cancelling ? <Spinner size={16} className="mx-auto" /> : t("agenda.groupCancel")}
            </button>
          )}
          <Button variant="secondary" onClick={onClose} className="w-full">
            {t("agenda.cancelKeep")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
