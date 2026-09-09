"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSession } from "@/lib/auth/SessionProvider";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Select from "@/components/ui/Select";
import { inputClass, labelClass } from "@/lib/ui/styles";
import type { Service, ServiceType, ServiceLocation } from "@/lib/services/types";
import { SERVICE_DURATIONS, durationLabel } from "@/lib/services/durations";
const TYPES: ServiceType[] = ["single", "pack", "subscription"];
// Validité d'un pack, en jours (0 = sans limite) ; délai d'annulation en h.
const VALIDITIES = [0, 30, 60, 90, 180, 365];
const CANCEL_HOURS = [12, 24, 48];
// Séances par semaine au plus sur un pack (0 = sans limite).
const MAX_PER_WEEK = [0, 1, 2, 3, 4, 5];

// Création ET édition : passer `service` pré-remplit le formulaire et
// enregistre en UPDATE au lieu d'un INSERT.
export default function AddServiceModal({
  onClose,
  onCreated,
  service,
  packsAllowed = true,
  services = [],
}: {
  onClose: () => void;
  onCreated: () => void;
  service?: Service;
  // Toutes les prestations du coach : un pack collectif se rattache à une
  // de ses prestations collectives.
  services?: Service[];
  // Coach Essentiel : le type « pack » est verrouillé (fonctionnalité Pro).
  // Un pack existant reste éditable pour être désactivé.
  packsAllowed?: boolean;
}) {
  const { t } = useI18n();
  const { googleConnected } = useSession();
  const [name, setName] = useState(service?.name ?? "");
  const [type, setType] = useState<ServiceType>(service?.type ?? "single");
  const [price, setPrice] = useState(
    service ? String(service.price_cents / 100).replace(".", ",") : ""
  );
  const [duration, setDuration] = useState(service?.duration_min ?? 60);
  const [packSize, setPackSize] = useState(
    service?.pack_size ? String(service.pack_size) : "10"
  );
  const [validity, setValidity] = useState<number>(
    service?.validity_days ?? 90
  );
  const [cancelHours, setCancelHours] = useState<number>(
    service?.cancel_hours ?? 24
  );
  const [maxPerWeek, setMaxPerWeek] = useState<number>(service?.max_per_week ?? 0);
  // Pack collectif : rattaché à une prestation collective, ses places se
  // posent sur les cours de cette prestation.
  const groupServices = services.filter(
    (s) => s.type === "single" && (s.capacity ?? 1) > 1 && s.id !== service?.id
  );
  const [packGroup, setPackGroup] = useState(!!service?.group_service_id);
  const [groupServiceId, setGroupServiceId] = useState(
    service?.group_service_id ?? groupServices[0]?.id ?? ""
  );
  const [location, setLocation] = useState<ServiceLocation>(
    service?.location ?? "in_person"
  );
  // Format d'une séance : individuelle (1 place) ou collective (2 à 50
  // places, prix par personne, cours planifiés depuis l'agenda).
  const [group, setGroup] = useState((service?.capacity ?? 1) > 1);
  const [capacity, setCapacity] = useState(
    String((service?.capacity ?? 1) > 1 ? service?.capacity : 8)
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t("services.errors.nameRequired"));

    const priceCents = Math.round((parseFloat(price.replace(",", ".")) || 0) * 100);
    // Jamais de prestation gratuite : une offre à 0 € serait réservable par
    // n'importe qui sans engagement (et bloquée en base, contrainte 0074).
    if (priceCents < 100) return setError(t("services.errors.priceMin"));
    if (type === "pack" && packGroup && !groupServiceId) {
      return setError(t("services.form.packGroupRequired"));
    }
    const cap = type === "single" && group
      ? Math.min(50, Math.max(2, Number(capacity) || 2))
      : 1;

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t("services.errors.generic"));
        return;
      }

      const values = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        location,
        duration_min: type === "subscription" ? null : duration,
        price_cents: priceCents,
        currency: "eur",
        pack_size: type === "pack" ? Number(packSize) || null : null,
        // Conditions du pack (migration 0056). Un pack déjà acheté garde
        // les siennes : l'instantané est pris à l'achat.
        validity_days: type === "pack" && validity > 0 ? validity : null,
        cancel_hours: type === "pack" ? cancelHours : 24,
        max_per_week: type === "pack" && maxPerWeek > 0 ? maxPerWeek : null,
        capacity: cap,
        group_service_id: type === "pack" && packGroup ? groupServiceId : null,
        // Modifier une prestation désactivée ne la republie pas : l'état
        // actif se change depuis la liste.
        active: service ? service.active : true,
      };

      const { error } = service
        ? await supabase.from("services").update(values).eq("id", service.id)
        : await supabase
            .from("services")
            .insert({ coach_id: user.id, ...values });

      if (error) {
        // Trigger SQL : 3 packs actifs maximum par coach.
        setError(
          /pack_limit/.test(error.message ?? "")
            ? t("services.errors.packLimit")
            : t("services.errors.generic")
        );
        return;
      }
      onCreated();
    } catch {
      setError(t("services.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label={service ? t("services.form.editTitle") : t("services.form.title")}
      className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
    >
        <h2 className="text-lg font-semibold text-text-base">
          {service ? t("services.form.editTitle") : t("services.form.title")}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.name")}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("services.form.namePlaceholder")}
              required
              autoFocus
              className={inputClass}
            />
          </label>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.type")}</span>
            <div className="flex gap-2">
              {TYPES.map((ty) => {
                const locked = ty === "pack" && !packsAllowed && service?.type !== "pack";
                return (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={type === ty}
                    disabled={locked}
                    title={locked ? t("plans.lock.packType") : undefined}
                    onClick={() => !locked && setType(ty)}
                    className={`flex-1 rounded-full border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                      type === ty
                        ? "border-accent bg-accent/10 text-accent"
                        : locked
                        ? "cursor-not-allowed border-border text-text-dim"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {t(`services.types.${ty}`)}
                    {locked ? " 🔒" : ""}
                  </button>
                );
              })}
            </div>
            {!packsAllowed && service?.type !== "pack" && (
              <span className="text-xs text-text-dim">{t("plans.lock.packType")}</span>
            )}
          </div>

          {/* Format : individuelle ou collective (séance simple seulement) */}
          {type === "single" && (
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.format")}</span>
              <div className="flex gap-2">
                {[false, true].map((opt) => (
                  <button
                    key={String(opt)}
                    type="button"
                    aria-pressed={group === opt}
                    onClick={() => setGroup(opt)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      group === opt
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {opt ? t("services.form.groupFormat") : t("services.form.individualFormat")}
                  </button>
                ))}
              </div>
              {group && (
                <p className="text-xs leading-relaxed text-text-dim">
                  {t("services.form.groupHint")}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                {type === "single" && group
                  ? t("services.form.pricePerPerson")
                  : t("services.form.price")}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </label>

            {type === "pack" ? (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("services.form.packSize")}</span>
                <input
                  type="number"
                  min={1}
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  className={inputClass}
                />
              </label>
            ) : type === "single" ? (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("services.form.duration")}</span>
                <Select
                  value={String(duration)}
                  onChange={(v) => setDuration(Number(v))}
                  ariaLabel={t("services.form.duration")}
                  options={(SERVICE_DURATIONS.includes(duration)
                    ? SERVICE_DURATIONS
                    : [...SERVICE_DURATIONS, duration].sort((a, b) => a - b)
                  ).map((d) => ({ value: String(d), label: durationLabel(d) }))}
                />
              </label>
            ) : (
              <div />
            )}
          </div>

          {/* Places d'un cours collectif */}
          {type === "single" && group && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.capacity")}</span>
              <input
                type="number"
                min={2}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          {/* Pack : séances individuelles ou places sur des cours collectifs */}
          {type === "pack" && (
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.packFormat")}</span>
              <div className="flex gap-2">
                {[false, true].map((opt) => (
                  <button
                    key={String(opt)}
                    type="button"
                    aria-pressed={packGroup === opt}
                    disabled={opt && groupServices.length === 0}
                    onClick={() => setPackGroup(opt)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      packGroup === opt
                        ? "border-accent bg-accent/10 text-accent"
                        : opt && groupServices.length === 0
                        ? "cursor-not-allowed border-border text-text-dim"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {opt ? t("services.form.packGroup") : t("services.form.packIndividual")}
                  </button>
                ))}
              </div>
              {packGroup ? (
                <>
                  <Select
                    value={groupServiceId}
                    onChange={setGroupServiceId}
                    ariaLabel={t("services.form.packGroupService")}
                    options={groupServices.map((s) => ({ value: s.id, label: s.name }))}
                  />
                  <p className="text-xs leading-relaxed text-text-dim">
                    {t("services.form.packGroupHint")}
                  </p>
                </>
              ) : groupServices.length === 0 ? (
                <p className="text-xs leading-relaxed text-text-dim">
                  {t("services.form.packGroupNone")}
                </p>
              ) : null}
            </div>
          )}

          {/* Conditions du pack : validité et délai d'annulation gratuite */}
          {type === "pack" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("services.form.validity")}</span>
                <Select
                  value={String(validity)}
                  onChange={(v) => setValidity(Number(v))}
                  ariaLabel={t("services.form.validity")}
                  options={VALIDITIES.map((d) => ({
                    value: String(d),
                    label:
                      d === 0
                        ? t("services.form.validityNone")
                        : `${Math.round(d / 30)} ${t("services.form.validityMonths")}`,
                  }))}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("services.form.cancelHours")}</span>
                <Select
                  value={String(cancelHours)}
                  onChange={(v) => setCancelHours(Number(v))}
                  ariaLabel={t("services.form.cancelHours")}
                  options={CANCEL_HOURS.map((h) => ({
                    value: String(h),
                    label: `${h} ${t("services.form.cancelHoursUnit")}`,
                  }))}
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className={labelClass}>{t("services.form.maxPerWeek")}</span>
                <Select
                  value={String(maxPerWeek)}
                  onChange={(v) => setMaxPerWeek(Number(v))}
                  ariaLabel={t("services.form.maxPerWeek")}
                  options={MAX_PER_WEEK.map((n) => ({
                    value: String(n),
                    label:
                      n === 0
                        ? t("services.form.maxPerWeekNone")
                        : t("services.form.maxPerWeekN").replace("{n}", String(n)),
                  }))}
                />
              </label>
              <p className="col-span-2 text-xs leading-relaxed text-text-dim">
                {t("services.form.validityHint")} {t("services.form.cancelHint")}{" "}
                {t("services.form.maxPerWeekHint")}
              </p>
            </div>
          )}

          {/* Lieu */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.location")}</span>
            <div className="flex gap-2">
              {(["in_person", "online"] as ServiceLocation[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={location === opt}
                  disabled={opt === "online" && !googleConnected && location !== "online"}
                  title={opt === "online" && !googleConnected ? t("services.form.onlineNeedsGoogle") : undefined}
                  onClick={() => setLocation(opt)}
                  className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    location === opt
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-strong text-text-muted hover:text-text-base"
                  }`}
                >
                  {opt === "in_person"
                    ? t("services.form.inPerson")
                    : t("services.form.online")}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.description")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("services.form.descriptionPlaceholder")}
              className={`${inputClass} resize-none`}
            />
          </label>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t("services.form.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? t("services.form.creating")
                : service
                ? t("services.form.save")
                : t("services.form.create")}
            </Button>
          </div>
        </form>
    </Dialog>
  );
}
