"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Booking, ClientOption, LocationKind } from "@/lib/bookings/types";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { inputClass } from "@/lib/ui/styles";

const DURATIONS = [30, 45, 60, 90];

const pad = (n: number) => String(n).padStart(2, "0");

// Création OU modification d'une séance : passer `booking` pré-remplit les
// champs et bascule en mode édition (update au lieu d'insert).
export default function AddSessionModal({
  clients,
  booking,
  onClose,
  onCreated,
}: {
  clients: ClientOption[];
  booking?: Booking | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const editing = !!booking;
  const init = booking ? new Date(booking.starts_at) : null;
  const initDuration = booking
    ? Math.max(
        15,
        Math.round(
          (new Date(booking.ends_at).getTime() -
            new Date(booking.starts_at).getTime()) /
            60000
        )
      )
    : 60;

  const [clientId, setClientId] = useState(booking?.client_id ?? "");
  const [date, setDate] = useState(
    init ? `${init.getFullYear()}-${pad(init.getMonth() + 1)}-${pad(init.getDate())}` : ""
  );
  const [time, setTime] = useState(
    init ? `${pad(init.getHours())}:${pad(init.getMinutes())}` : ""
  );
  const [duration, setDuration] = useState(initDuration);
  const [location, setLocation] = useState<LocationKind>(
    booking?.location ?? "in_person"
  );
  const [locationText, setLocationText] = useState(booking?.location_text ?? "");
  const [meetingUrl, setMeetingUrl] = useState(booking?.meeting_url ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Durée existante hors presets (ex. 75 min) : on l'ajoute aux options.
  const durations = DURATIONS.includes(duration)
    ? DURATIONS
    : [...DURATIONS, duration].sort((a, b) => a - b);

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

      // Prévention du double-booking : une autre séance (non annulée)
      // chevauche-t-elle ce créneau ?
      let overlapQuery = supabase
        .from("bookings")
        .select("id")
        .in("status", ["pending", "confirmed"])
        .lt("starts_at", ends.toISOString())
        .gt("ends_at", starts.toISOString())
        .limit(1);
      if (editing && booking) {
        overlapQuery = overlapQuery.neq("id", booking.id);
      }
      const { data: overlapping } = await overlapQuery;
      if ((overlapping ?? []).length > 0) {
        setError(t("agenda.errors.overlap"));
        return;
      }

      const payload = {
        client_id: clientId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        location,
        location_text:
          location === "in_person" ? locationText.trim() || null : null,
        meeting_url: location === "online" ? meetingUrl.trim() || null : null,
        notes: notes.trim() || null,
      };

      const { error } = editing
        ? await supabase.from("bookings").update(payload).eq("id", booking!.id)
        : await supabase.from("bookings").insert({
            ...payload,
            coach_id: user.id,
            status: "confirmed",
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

  const fieldClass = inputClass;

  return (
    <Dialog
      onClose={onClose}
      label={editing ? t("agenda.form.editTitle") : t("agenda.form.title")}
      className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
        <h2 className="text-lg font-semibold text-text-base">
          {editing ? t("agenda.form.editTitle") : t("agenda.form.title")}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {/* Client (obligatoire : astérisque visuel + required natif) */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.form.client")}
              <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
            </span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
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
                <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.time")}
                <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
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
              {durations.map((d) => (
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
                  aria-pressed={location === opt}
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

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t("agenda.form.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? editing
                  ? t("agenda.form.saving")
                  : t("agenda.form.creating")
                : editing
                ? t("agenda.form.save")
                : t("agenda.form.create")}
            </Button>
          </div>
        </form>
    </Dialog>
  );
}
