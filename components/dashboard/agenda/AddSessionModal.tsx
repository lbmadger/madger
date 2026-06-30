"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ClientOption, LocationKind } from "@/lib/bookings/types";

const DURATIONS = [30, 45, 60, 90];

export default function AddSessionModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: ClientOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState<LocationKind>("in_person");
  const [locationText, setLocationText] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError(t("agenda.errors.clientRequired"));
      return;
    }
    if (!date || !time) {
      setError(t("agenda.errors.dateRequired"));
      return;
    }

    // L'heure saisie est locale au navigateur ; toISOString() la convertit en
    // UTC pour le stockage. L'affichage la reconvertit côté lecture.
    const starts = new Date(`${date}T${time}`);
    const ends = new Date(starts.getTime() + duration * 60 * 1000);

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t("agenda.errors.generic"));
        return;
      }

      const { error } = await supabase.from("bookings").insert({
        coach_id: user.id,
        client_id: clientId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "confirmed",
        location,
        location_text:
          location === "in_person" ? locationText.trim() || null : null,
        meeting_url: location === "online" ? meetingUrl.trim() || null : null,
        notes: notes.trim() || null,
      });

      if (error) {
        setError(t("agenda.errors.generic"));
        return;
      }
      onCreated();
    } catch {
      setError(t("agenda.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "rounded-lg border border-border-strong bg-bg-elevated px-3 py-2.5 text-base text-text-base outline-none transition-colors focus:border-accent";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-base">
          {t("agenda.form.title")}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {/* Client */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.form.client")}
            </span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={fieldClass}
            >
              <option value="">{t("agenda.form.selectClient")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </label>

          {/* Date + heure */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.date")}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.time")}
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {/* Durée */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.form.duration")}
            </span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={fieldClass}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>

          {/* Lieu : présentiel / visio */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.form.location")}
            </span>
            <div className="flex gap-2">
              {(["in_person", "online"] as LocationKind[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocation(opt)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    location === opt
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-strong text-text-muted hover:text-text-base"
                  }`}
                >
                  {opt === "in_person"
                    ? t("agenda.form.inPerson")
                    : t("agenda.form.online")}
                </button>
              ))}
            </div>
          </div>

          {/* Champ conditionnel selon le lieu */}
          {location === "in_person" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.locationText")}
              </span>
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder={t("agenda.form.locationTextPlaceholder")}
                className={`${fieldClass} placeholder:text-text-dim`}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.meetingUrl")}
              </span>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={t("agenda.form.meetingUrlPlaceholder")}
                className={`${fieldClass} placeholder:text-text-dim`}
              />
            </label>
          )}

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.form.notes")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base"
            >
              {t("agenda.form.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? t("agenda.form.creating") : t("agenda.form.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
