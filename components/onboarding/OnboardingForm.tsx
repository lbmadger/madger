"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { slugify, isValidSlug } from "@/lib/utils/slug";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import { inputClass, labelClass } from "@/lib/ui/styles";
import {
  SPORT_KEYS,
  SPECIALTY_KEYS,
  VENUE_KEYS,
} from "@/lib/coaches/taxonomy";
import { WEEK_ORDER } from "@/lib/availability/types";

// Onboarding guidé en 5 étapes (identité → photo et bio → activité →
// première prestation → disponibilités), avec barre de progression. À la fin,
// dernière marche : activer les paiements Stripe. La marketplace n'affiche
// que les profils complets : ce parcours amène le coach jusque-là.

const TOTAL_STEPS = 5;
const DURATIONS = [30, 45, 60, 90];

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

  const [step, setStep] = useState(1); // 1..5, 6 = écran final
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 : identité
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

  // Étape 2 : photo + bio
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Étape 3 : activité
  const [siret, setSiret] = useState("");
  const [sport, setSport] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [venues, setVenues] = useState<string[]>([]);
  const [gymName, setGymName] = useState("");

  // Étape 4 : première prestation
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState(60);

  // Étape 5 : disponibilités
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("18:00");

  function syncNames(next: { first?: string; last?: string }) {
    const f = next.first ?? firstName;
    const l = next.last ?? lastName;
    if (next.first !== undefined) setFirstName(next.first);
    if (next.last !== undefined) setLastName(next.last);
    if (!slugTouched) setSlug(slugify(`${f} ${l}`));
  }

  function toggle(list: string[], set: (v: string[]) => void, key: string) {
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  // ── Étape 1 : enregistre l'identité (le coach existe dès cette étape) ─────
  async function submitIdentity(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) return setError(t("onboarding.errors.nameRequired"));
    if (!isValidSlug(slug)) return setError(t("onboarding.errors.slugInvalid"));

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
          siret: siret.trim() || null,
          slug,
          listed: true,
          onboarding_completed: true,
        })
        .eq("id", userId);
      if (error) {
        setError(
          error.code === "23505"
            ? t("onboarding.errors.slugTaken")
            : t("onboarding.errors.generic")
        );
        return;
      }
      setStep(2);
    } catch {
      setError(t("onboarding.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 2 : photo (upload immédiat) + bio (au clic Continuer) ──────────
  async function uploadAvatar(file: File) {
    setError(null);
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError(t("settings.photoErr"));
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setError(t("settings.photoErr"));
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await supabase
        .from("coaches")
        .update({ avatar_url: url })
        .eq("id", userId);
      setAvatarUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function submitPhotoBio() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase
        .from("coaches")
        .update({ bio: bio.trim() || null })
        .eq("id", userId);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 3 : activité ────────────────────────────────────────────────────
  async function submitActivity() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase
        .from("coaches")
        .update({
          sport: sport || null,
          specialties,
          venues,
          gym_name: gymName.trim() || null,
        })
        .eq("id", userId);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 4 : première prestation ─────────────────────────────────────────
  async function submitService() {
    setError(null);
    const priceCents = Math.round(
      (parseFloat(servicePrice.replace(",", ".")) || 0) * 100
    );
    if (!serviceName.trim() || priceCents <= 0) {
      setError(t("onboarding.serviceInvalid"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("services").insert({
        coach_id: userId,
        name: serviceName.trim(),
        type: "single",
        location: acceptsOnline && !city ? "online" : "in_person",
        duration_min: serviceDuration,
        price_cents: priceCents,
        currency: "eur",
        active: true,
      });
      if (error) {
        setError(t("onboarding.errors.generic"));
        return;
      }
      setStep(5);
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 5 : disponibilités ──────────────────────────────────────────────
  async function submitAvailability() {
    setError(null);
    if (days.length === 0 || dayEnd <= dayStart) {
      setError(t("onboarding.availInvalid"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("availabilities").insert(
        days.map((weekday) => ({
          coach_id: userId,
          weekday,
          start_time: dayStart,
          end_time: dayEnd,
        }))
      );
      if (error) {
        setError(t("onboarding.errors.generic"));
        return;
      }
      setStep(6);
    } finally {
      setLoading(false);
    }
  }

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-border-strong text-text-muted hover:text-text-base"
    }`;

  // ── Écran final : paiements Stripe + dashboard ────────────────────────────
  if (step === 6) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
          {t("onboarding.doneTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {t("onboarding.doneSubtitle")}
        </p>

        <div className="mt-5 rounded-xl border border-accent/25 bg-accent/[0.05] p-4">
          <p className="text-sm font-semibold text-text-base">
            {t("onboarding.stripeTitle")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t("onboarding.stripeDesc")}
          </p>
          <Button
            onClick={() => {
              router.push("/dashboard/paiements");
              router.refresh();
            }}
            className="mt-3"
          >
            {t("onboarding.stripeCta")}
          </Button>
        </div>


        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="mt-5 w-full text-center text-sm font-medium text-text-muted transition-colors hover:text-text-base"
        >
          {t("onboarding.goDashboard")}
        </button>
      </div>
    );
  }

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: t("onboarding.title"), subtitle: t("onboarding.subtitle") },
    2: {
      title: t("onboarding.photoTitle"),
      subtitle: t("onboarding.photoSubtitle"),
    },
    3: {
      title: t("onboarding.activityTitle"),
      subtitle: t("onboarding.activitySubtitle"),
    },
    4: {
      title: t("onboarding.serviceTitle"),
      subtitle: t("onboarding.serviceSubtitle"),
    },
    5: {
      title: t("onboarding.availTitle"),
      subtitle: t("onboarding.availSubtitle"),
    },
  };

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      {/* Progression */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            {t("onboarding.stepLabel")} {step} {t("onboarding.of")} {TOTAL_STEPS}
          </span>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="font-medium transition-colors hover:text-text-base"
            >
              ‹ {t("onboarding.back")}
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {stepTitles[step].title}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{stepTitles[step].subtitle}</p>

      {/* ── Étape 1 : identité ── */}
      {step === 1 && (
        <form onSubmit={submitIdentity} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("onboarding.firstName")}</span>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => syncNames({ first: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("onboarding.lastName")}</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => syncNames({ last: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("onboarding.specialty")}</span>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder={t("onboarding.specialtyPlaceholder")}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("onboarding.city")}</span>
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

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("onboarding.siret")}</span>
            <input
              type="text"
              inputMode="numeric"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              placeholder="123 456 789 00012"
              className={inputClass}
            />
            <span className="text-xs text-text-dim">
              {t("onboarding.siretHint")}
            </span>
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
            <span className={labelClass}>{t("onboarding.slugLabel")}</span>
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

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? t("onboarding.saving") : t("onboarding.next")}
          </Button>
        </form>
      )}

      {/* ── Étape 2 : photo + bio ── */}
      {step === 2 && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={72}
                height={72}
                className="h-18 w-18 rounded-full border border-border-strong object-cover"
                style={{ height: 72, width: 72 }}
              />
            ) : (
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent/10 text-xl font-semibold text-accent">
                {firstName.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 text-sm"
              >
                {uploading
                  ? t("settings.photoUploading")
                  : avatarUrl
                  ? t("onboarding.changePhoto")
                  : t("onboarding.addPhoto")}
              </Button>
              <p className="mt-1.5 text-xs text-text-dim">
                {t("onboarding.photoHint")}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
              }}
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("onboarding.bioLabel")}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder={t("onboarding.bioPlaceholder")}
              className={`${inputClass} resize-none`}
            />
          </label>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button
            onClick={submitPhotoBio}
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? t("onboarding.saving") : t("onboarding.next")}
          </Button>
        </div>
      )}

      {/* ── Étape 3 : activité ── */}
      {step === 3 && (
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.sport")}</span>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className={inputClass}
            >
              <option value="">-</option>
              {SPORT_KEYS.map((s) => (
                <option key={s} value={s}>
                  {t(`taxonomy.sports.${s}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.specialtiesLabel")}</span>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={specialties.includes(k)}
                  onClick={() => toggle(specialties, setSpecialties, k)}
                  className={chipClass(specialties.includes(k))}
                >
                  {t(`clientOnboarding.goals.${k}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.venuesLabel")}</span>
            <div className="flex flex-wrap gap-2">
              {VENUE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={venues.includes(k)}
                  onClick={() => toggle(venues, setVenues, k)}
                  className={chipClass(venues.includes(k))}
                >
                  {t(`taxonomy.venues.${k}`)}
                </button>
              ))}
            </div>
          </div>

          {venues.includes("coach_gym") && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("settings.gymName")}</span>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder={t("settings.gymNamePlaceholder")}
                className={inputClass}
              />
            </label>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button
            onClick={submitActivity}
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? t("onboarding.saving") : t("onboarding.next")}
          </Button>
        </div>
      )}

      {/* ── Étape 4 : première prestation ── */}
      {step === 4 && (
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("services.form.name")}</span>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder={t("onboarding.servicePlaceholder")}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.price")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="50"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("services.form.duration")}</span>
              <select
                value={serviceDuration}
                onChange={(e) => setServiceDuration(Number(e.target.value))}
                className={inputClass}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button
            onClick={submitService}
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? t("onboarding.saving") : t("onboarding.next")}
          </Button>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="text-center text-xs font-medium text-text-dim transition-colors hover:text-text-base"
          >
            {t("onboarding.skip")}
          </button>
        </div>
      )}

      {/* ── Étape 5 : disponibilités ── */}
      {step === 5 && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("onboarding.daysLabel")}</span>
            <div className="flex flex-wrap gap-2">
              {WEEK_ORDER.map(({ weekday, key }) => (
                <button
                  key={weekday}
                  type="button"
                  aria-pressed={days.includes(weekday)}
                  onClick={() =>
                    setDays(
                      days.includes(weekday)
                        ? days.filter((d) => d !== weekday)
                        : [...days, weekday]
                    )
                  }
                  className={chipClass(days.includes(weekday))}
                >
                  {t(`availability.days.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("onboarding.fromLabel")}</span>
              <input
                type="time"
                value={dayStart}
                onChange={(e) => setDayStart(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("onboarding.toLabel")}</span>
              <input
                type="time"
                value={dayEnd}
                onChange={(e) => setDayEnd(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button
            onClick={submitAvailability}
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? t("onboarding.saving") : t("onboarding.next")}
          </Button>
          <button
            type="button"
            onClick={() => setStep(6)}
            className="text-center text-xs font-medium text-text-dim transition-colors hover:text-text-base"
          >
            {t("onboarding.skip")}
          </button>
        </div>
      )}
    </div>
  );
}
