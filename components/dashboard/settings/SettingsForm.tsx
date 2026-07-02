"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { slugify, isValidSlug } from "@/lib/utils/slug";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import LanguagePicker from "@/components/settings/LanguagePicker";
import PolicyTiers from "@/components/booking/PolicyTiers";
import { inputClass, labelClass } from "@/lib/ui/styles";
import {
  normalizePolicy,
  type CancellationPolicy,
} from "@/lib/booking/cancellation";
import type { Coach } from "@/lib/coach/getCoach";

const POLICY_OPTIONS: CancellationPolicy[] = ["flexible", "moderate", "strict"];

export default function SettingsForm({ coach }: { coach: Coach }) {
  const { t } = useI18n();
  const router = useRouter();

  const [firstName, setFirstName] = useState(coach.first_name ?? "");
  const [lastName, setLastName] = useState(coach.last_name ?? "");
  const [specialty, setSpecialty] = useState(coach.specialty ?? "");
  const [city, setCity] = useState(coach.city ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    coach.lat != null && coach.lng != null
      ? { lat: coach.lat, lng: coach.lng }
      : null
  );
  const [bio, setBio] = useState(coach.bio ?? "");
  const [acceptsOnline, setAcceptsOnline] = useState(coach.accepts_online);
  const [slug, setSlug] = useState(coach.slug ?? "");
  const [listed, setListed] = useState(coach.listed);
  const [policy, setPolicy] = useState<CancellationPolicy>(
    normalizePolicy(coach.cancellation_policy)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (!firstName.trim()) return setError(t("settings.errors.nameRequired"));
    if (!isValidSlug(slug)) return setError(t("settings.errors.slugInvalid"));

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("coaches")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          specialty: specialty.trim() || null,
          city: city.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          bio: bio.trim() || null,
          accepts_online: acceptsOnline,
          slug,
          listed,
          cancellation_policy: policy,
        })
        .eq("id", coach.id);

      if (error) {
        if (error.code === "23505") setError(t("settings.errors.slugTaken"));
        else setError(t("settings.errors.generic"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("settings.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Lien vers la page publique */}
      {coach.slug && (
        <Link
          href={`/${coach.slug}`}
          target="_blank"
          className="flex items-center justify-between rounded-2xl border border-accent/20 bg-accent/[0.04] px-4 py-3 transition-colors hover:border-accent/40"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text-base">
              {t("settings.viewPublic")}
            </span>
            <span className="block truncate text-xs text-text-muted">
              madger.app/{coach.slug}
            </span>
          </span>
          <svg className="shrink-0 text-accent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </Link>
      )}

      <section className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-text-base">
          {t("settings.profileSection")}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("settings.firstName")} value={firstName} onChange={setFirstName} />
            <Field label={t("settings.lastName")} value={lastName} onChange={setLastName} />
          </div>
          <Field label={t("settings.specialty")} value={specialty} onChange={setSpecialty} />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.city")}</span>
            <CityAutocomplete
              value={city}
              onChange={(v) => {
                setCity(v);
                setCoords(null);
              }}
              onSelect={(c) => {
                setCity(c.name);
                setCoords({ lat: c.lat, lng: c.lng });
              }}
              inputClassName={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.bio")}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={t("settings.bioPlaceholder")}
              className={`${inputClass} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.slug")}</span>
            <div className="flex items-center rounded-xl border border-border-strong bg-white/[0.03] transition-colors focus-within:border-accent">
              <span className="pl-4 text-base text-text-dim">madger.app/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full bg-transparent py-3 pr-4 text-base text-text-base outline-none"
              />
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3">
            <input type="checkbox" checked={acceptsOnline} onChange={(e) => setAcceptsOnline(e.target.checked)} className="h-4 w-4 shrink-0 accent-accent" />
            <span className="text-sm text-text-base">{t("settings.acceptsOnline")}</span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3">
            <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
            <span>
              <span className="block text-sm text-text-base">{t("settings.listed")}</span>
              <span className="block text-xs text-text-dim">{t("settings.listedHint")}</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && <p className="text-sm text-accent">{t("settings.saved")}</p>}

          <Button onClick={handleSave} disabled={loading} className="mt-1 self-start">
            {loading ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </section>

      {/* Politique d'annulation */}
      <section className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-text-base">
          {t("cancellation.title")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{t("cancellation.subtitle")}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {POLICY_OPTIONS.map((opt) => {
            const active = policy === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setPolicy(opt)}
                className={`flex flex-col rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/[0.06]"
                    : "border-border-strong hover:border-accent/40"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-base">
                    {t(`cancellation.${opt}`)}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      active ? "border-accent bg-accent" : "border-border-strong"
                    }`}
                  />
                </span>
                <span className="mt-1 text-xs text-text-dim">
                  {t(`cancellation.${opt}Desc`)}
                </span>
                <PolicyTiers policy={opt} className="mt-3" />
              </button>
            );
          })}
        </div>

        <Link
          href="/charte-paiement"
          target="_blank"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          {t("cancellation.seeCharter")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </Link>

        <Button onClick={handleSave} disabled={loading} className="mt-4 self-start">
          {loading ? t("cancellation.saving") : t("cancellation.save")}
        </Button>
      </section>

      {/* Préférences (langue de l'app) */}
      <section className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-text-base">
          {t("settings.prefsSection")}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{t("settings.language")}</p>
        <div className="mt-3">
          <LanguagePicker />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
