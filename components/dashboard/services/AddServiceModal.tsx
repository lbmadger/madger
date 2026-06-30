"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";
import type { ServiceType, ServiceLocation } from "@/lib/services/types";

const DURATIONS = [30, 45, 60, 90];
const TYPES: ServiceType[] = ["single", "pack", "subscription"];

export default function AddServiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [type, setType] = useState<ServiceType>("single");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState(60);
  const [packSize, setPackSize] = useState("10");
  const [location, setLocation] = useState<ServiceLocation>("in_person");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t("services.errors.nameRequired"));

    const priceCents = Math.round((parseFloat(price.replace(",", ".")) || 0) * 100);

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

      const { error } = await supabase.from("services").insert({
        coach_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        location,
        duration_min: type === "subscription" ? null : duration,
        price_cents: priceCents,
        currency: "eur",
        pack_size: type === "pack" ? Number(packSize) || null : null,
        active: true,
      });

      if (error) {
        setError(t("services.errors.generic"));
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-base">
          {t("services.form.title")}
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
              {TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  className={`flex-1 rounded-full border px-2 py-2 text-sm font-medium transition-colors ${
                    type === ty
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-strong text-text-muted hover:text-text-base"
                  }`}
                >
                  {t(`services.types.${ty}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.price")}</span>
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
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={inputClass}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}
          </div>

          {/* Lieu */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.location")}</span>
            <div className="flex gap-2">
              {(["in_person", "online"] as ServiceLocation[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t("services.form.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t("services.form.creating") : t("services.form.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
