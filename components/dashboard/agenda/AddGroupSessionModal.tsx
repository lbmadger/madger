"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AgendaService, LocationKind } from "@/lib/bookings/types";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import { inputClass } from "@/lib/ui/styles";
import { SERVICE_DURATIONS, durationLabel } from "@/lib/services/durations";
import { formatPrice } from "@/lib/services/types";

const pad = (n: number) => String(n).padStart(2, "0");
const REPEAT_WEEKS = [1, 2, 4, 6, 8, 12];

// Planification d'un cours collectif (migration 0068) : prestation
// collective, date, durée, places, lieu, et répétition hebdomadaire en une
// fois. Les chevauchements sont refusés par la base (trigger slot_taken) :
// en série, les dates prises sont simplement sautées et signalées.
export default function AddGroupSessionModal({
  services,
  onClose,
  onCreated,
}: {
  services: AgendaService[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, locale } = useI18n();
  const groupServices = useMemo(
    () => services.filter((s) => s.type === "single" && (s.capacity ?? 1) > 1),
    [services]
  );
  const [serviceId, setServiceId] = useState(groupServices[0]?.id ?? "");
  const service = groupServices.find((s) => s.id === serviceId) ?? null;
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(service?.duration_min ?? 60);
  const [capacity, setCapacity] = useState(String(service?.capacity ?? 8));
  const [location, setLocation] = useState<LocationKind>(service?.location ?? "in_person");
  const [locationText, setLocationText] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [weeks, setWeeks] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickService(id: string) {
    setServiceId(id);
    const s = groupServices.find((x) => x.id === id);
    if (s) {
      setDuration(s.duration_min ?? 60);
      setCapacity(String(s.capacity ?? 8));
      setLocation(s.location);
    }
  }

  const durations = SERVICE_DURATIONS.includes(duration)
    ? SERVICE_DURATIONS
    : [...SERVICE_DURATIONS, duration].sort((a, b) => a - b);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!service) return setError(t("agenda.group.noService"));
    if (!date || !time) return setError(t("agenda.errors.dateRequired"));
    const first = new Date(`${date}T${time}`);
    if (first.getTime() < Date.now()) return setError(t("agenda.errors.pastDate"));
    const cap = Math.min(50, Math.max(1, Number(capacity) || 1));

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
      const seriesId = weeks > 1 ? crypto.randomUUID() : null;
      let ok = 0;
      let ko = 0;
      for (let w = 0; w < weeks; w++) {
        const starts = new Date(first.getTime() + w * 7 * 86400000);
        const ends = new Date(starts.getTime() + duration * 60000);
        const { error: insertError } = await supabase.from("group_sessions").insert({
          coach_id: user.id,
          service_id: service.id,
          name: service.name,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          capacity: cap,
          price_cents: service.price_cents,
          currency: service.currency || "eur",
          location,
          location_text: location === "in_person" ? locationText.trim() || null : null,
          meeting_url: location === "online" ? meetingUrl.trim() || null : null,
          notes: notes.trim() || null,
          series_id: seriesId,
        });
        if (insertError) {
          // slot_taken (trigger) : cette date est déjà occupée, on passe.
          if (/slot_taken/.test(insertError.message ?? "")) ko++;
          else {
            setError(t("agenda.errors.generic"));
            return;
          }
        } else ok++;
      }
      if (ok === 0) {
        setError(t("agenda.errors.overlap"));
        return;
      }
      if (ko > 0) {
        // Résultat partiel : on prévient, puis on ferme (les cours créés
        // sont déjà dans l'agenda).
        window.alert(
          t("agenda.group.partial").replace("{ok}", String(ok)).replace("{ko}", String(ko))
        );
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
      label={t("agenda.group.title")}
      className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
      <h2 className="text-lg font-semibold text-text-base">{t("agenda.group.title")}</h2>

      {groupServices.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-text-muted">{t("agenda.group.noService")}</p>
          <Button variant="secondary" onClick={onClose} className="mt-4 w-full">
            {t("agenda.form.cancel")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("agenda.group.service")}
              <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
            </span>
            <Select
              value={serviceId}
              onChange={pickService}
              ariaLabel={t("agenda.group.service")}
              placeholder={t("agenda.group.selectService")}
              options={groupServices.map((s) => ({
                value: s.id,
                label: `${s.name} · ${formatPrice(s.price_cents, s.currency, locale)} ${t("agenda.groupPerPerson")}`,
              }))}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.date")}
                <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
              </span>
              <input
                type="date"
                value={date}
                min={`${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`}
                onChange={(e) => setDate(e.target.value)}
                required
                className={`${fieldClass} min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left`}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">
                {t("agenda.form.time")}
                <span aria-hidden="true" className="ml-0.5 text-danger">*</span>
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className={`${fieldClass} min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left`}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">{t("agenda.form.duration")}</span>
              <Select
                value={String(duration)}
                onChange={(v) => setDuration(Number(v))}
                ariaLabel={t("agenda.form.duration")}
                options={durations.map((d) => ({ value: String(d), label: durationLabel(d) }))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">{t("agenda.group.capacity")}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {/* Répétition hebdomadaire */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{t("agenda.group.repeat")}</span>
            <Select
              value={String(weeks)}
              onChange={(v) => setWeeks(Number(v))}
              ariaLabel={t("agenda.group.repeat")}
              options={REPEAT_WEEKS.map((n) => ({
                value: String(n),
                label: n === 1 ? t("agenda.group.once") : t("agenda.group.weeks").replace("{n}", String(n)),
              }))}
            />
          </label>

          {/* Lieu */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{t("agenda.form.location")}</span>
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
                  {opt === "in_person" ? t("agenda.form.inPerson") : t("agenda.form.online")}
                </button>
              ))}
            </div>
          </div>
          {location === "in_person" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">{t("agenda.form.locationText")}</span>
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
              <span className="text-xs font-medium text-text-muted">{t("agenda.form.meetingUrl")}</span>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={t("agenda.form.meetingUrlPlaceholder")}
                className={`${fieldClass} placeholder:text-text-dim`}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">{t("agenda.form.notes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </label>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t("agenda.form.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? t("agenda.group.creating")
                : weeks > 1
                ? t("agenda.group.createMany").replace("{n}", String(weeks))
                : t("agenda.group.create")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
