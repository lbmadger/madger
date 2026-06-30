"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { slugify, isValidSlug } from "@/lib/utils/slug";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import { inputClass } from "@/lib/ui/styles";

// Formulaire d'onboarding : nom + spécialité + slug du lien public. Écrit
// directement la ligne coaches via le client navigateur (RLS autorise le coach
// à modifier SA ligne). Le slug se génère automatiquement depuis le nom tant
// que l'utilisateur ne l'a pas édité à la main.

export default function OnboardingForm({
  userId,
  initialFirstName,
  initialLastName,
}: {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [acceptsOnline, setAcceptsOnline] = useState(false);
  const [slug, setSlug] = useState(
    slugify(`${initialFirstName} ${initialLastName}`)
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tant que le slug n'a pas été modifié manuellement, on le suit le nom.
  function syncNames(next: { first?: string; last?: string }) {
    const f = next.first ?? firstName;
    const l = next.last ?? lastName;
    if (next.first !== undefined) setFirstName(next.first);
    if (next.last !== undefined) setLastName(next.last);
    if (!slugTouched) setSlug(slugify(`${f} ${l}`));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError(t("onboarding.errors.nameRequired"));
      return;
    }
    if (!isValidSlug(slug)) {
      setError(t("onboarding.errors.slugInvalid"));
      return;
    }

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
          accepts_online: acceptsOnline,
          slug,
          // Profil présentable → visible sur la marketplace.
          listed: true,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (error) {
        // 23505 = violation d'unicité (slug déjà pris).
        if (error.code === "23505") {
          setError(t("onboarding.errors.slugTaken"));
        } else {
          setError(t("onboarding.errors.generic"));
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("onboarding.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {t("onboarding.title")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{t("onboarding.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("onboarding.firstName")}
            </span>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => syncNames({ first: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("onboarding.lastName")}
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => syncNames({ last: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {t("onboarding.specialty")}
          </span>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder={t("onboarding.specialtyPlaceholder")}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {t("onboarding.city")}
          </span>
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
            placeholder={t("onboarding.cityPlaceholder")}
            inputClassName={inputClass}
          />
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3">
          <input
            type="checkbox"
            checked={acceptsOnline}
            onChange={(e) => setAcceptsOnline(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-accent"
          />
          <span className="text-sm text-text-base">
            {t("onboarding.acceptsOnline")}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {t("onboarding.slugLabel")}
          </span>
          <div className="flex items-center rounded-xl border border-border-strong bg-white/[0.03] transition-colors focus-within:border-accent">
            <span className="pl-4 text-base text-text-dim">madger.app/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="w-full bg-transparent py-3 pr-4 text-base text-text-base outline-none"
            />
          </div>
          <span className="text-xs text-text-dim">
            {t("onboarding.slugHint")}
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? t("onboarding.saving") : t("onboarding.submit")}
        </Button>
      </form>
    </div>
  );
}
