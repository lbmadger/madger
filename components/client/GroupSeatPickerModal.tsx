"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import type { PublicGroupSession } from "@/lib/coaches/public-types";

// Poser une place d'un pack collectif sur un cours à venir du coach
// (cours de la prestation rattachée au pack, places restantes visibles).
export default function GroupSeatPickerModal({
  coachId,
  serviceId,
  coachName,
  packName,
  onSubmit,
  onClose,
}: {
  coachId: string;
  serviceId: string;
  coachName: string;
  packName: string;
  // Renvoie un message d'erreur (déjà traduit) ou null si tout est bon.
  onSubmit: (sessionId: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [sessions, setSessions] = useState<PublicGroupSession[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/group-sessions/upcoming?coach=${encodeURIComponent(coachId)}&service=${encodeURIComponent(serviceId)}`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { sessions?: PublicGroupSession[] }) => {
        if (!cancelled) setSessions(j.sessions ?? []);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [coachId, serviceId]);

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const msg = await onSubmit(selected);
    setSubmitting(false);
    if (msg) setError(msg);
  }

  return (
    <Dialog
      onClose={onClose}
      label={t("groupSeat.title")}
      className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
      <h2 className="text-lg font-extrabold tracking-tight text-text-base">
        {t("groupSeat.title")}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {packName} · {t("clientSpace.with")} {coachName}
      </p>

      <div className="mt-4">
        {loadError ? (
          <p className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-muted">
            {t("groupSeat.loadError")}
          </p>
        ) : sessions === null ? (
          <p className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-dim">
            {t("booking.slotsLoading")}
          </p>
        ) : sessions.length === 0 ? (
          <p className="rounded-xl border border-border bg-bg-elevated p-4 text-center text-sm text-text-muted">
            {t("groupSeat.none")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sessions.map((g) => {
              const left = Math.max(0, g.capacity - g.seats_taken);
              const full = left === 0;
              const active = selected === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    disabled={full}
                    aria-pressed={active}
                    onClick={() => setSelected(g.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-accent bg-accent/10"
                        : full
                        ? "cursor-not-allowed border-border opacity-50"
                        : "border-border-strong hover:border-accent/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-base">{g.name}</p>
                      <p className="text-xs text-text-muted first-letter:uppercase">
                        {new Date(g.starts_at).toLocaleString(loc, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {g.location === "online"
                          ? ` · ${t("booking.online")}`
                          : g.location_text
                          ? ` · ${g.location_text}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        full ? "text-text-dim" : left === 1 ? "text-warning" : "text-accent"
                      }`}
                    >
                      {full
                        ? t("coachProfile.groupFull")
                        : left === 1
                        ? t("coachProfile.groupSeatLeft")
                        : t("coachProfile.groupSeatsLeft").replace("{n}", String(left))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          disabled={!selected || submitting}
          onClick={submit}
          className="flex-1"
        >
          {submitting ? t("creditBooking.submitting") : t("groupSeat.submit")}
        </Button>
      </div>
    </Dialog>
  );
}
