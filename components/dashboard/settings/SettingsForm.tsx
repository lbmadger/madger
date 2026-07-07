"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { slugify, isValidSlug } from "@/lib/utils/slug";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import LanguagePicker from "@/components/settings/LanguagePicker";
import SettingsSection from "./SettingsSection";
import {
  UserIcon,
  ActivityIcon,
  ZapIcon,
  ShieldIcon,
  SlidersIcon,
  FileTextIcon,
} from "@/components/ui/icons";
import PolicyTiers from "@/components/booking/PolicyTiers";
import { inputClass, labelClass } from "@/lib/ui/styles";
import {
  resolveRefundPolicy,
  REFUND_PCT_CHOICES,
} from "@/lib/booking/cancellation";

// Fuseaux proposés : France métropolitaine + DOM-TOM + grandes villes
// francophones. Le fuseau pilote les créneaux affichés aux clients.
const TIMEZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "America/Martinique",
  "America/Guadeloupe",
  "America/Cayenne",
  "Indian/Reunion",
  "Indian/Mayotte",
  "Pacific/Noumea",
  "Pacific/Tahiti",
  "America/Montreal",
  "Africa/Casablanca",
  "Africa/Dakar",
  "Africa/Abidjan",
];
import {
  SPORT_KEYS,
  SPECIALTY_KEYS,
  VENUE_KEYS,
} from "@/lib/coaches/taxonomy";
import type { Coach } from "@/lib/coach/getCoach";


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
  // Politique d'annulation : deux pourcentages indépendants (plus de 24 h
  // avant la séance / moins de 24 h avant).
  const initialRefund = resolveRefundPolicy(coach);
  const [refundOver, setRefundOver] = useState<number>(initialRefund.overPct);
  const [refundUnder, setRefundUnder] = useState<number>(
    initialRefund.underPct
  );
  const [bookingMode, setBookingMode] = useState<"instant" | "approval">(
    coach.booking_mode === "instant" ? "instant" : "approval"
  );
  const [sport, setSport] = useState(coach.sport ?? "");
  const [specialties, setSpecialties] = useState<string[]>(
    coach.specialties ?? []
  );
  const [venues, setVenues] = useState<string[]>(coach.venues ?? []);
  const [gymName, setGymName] = useState(coach.gym_name ?? "");
  const [timezone, setTimezone] = useState(coach.timezone || "Europe/Paris");
  const [minNotice, setMinNotice] = useState(coach.min_notice_hours ?? 2);
  // Mentions légales de facturation (SIRET, TVA, adresse).
  const [businessName, setBusinessName] = useState(coach.business_name ?? "");
  const [siret, setSiret] = useState(coach.siret ?? "");
  const [vatNumber, setVatNumber] = useState(coach.vat_number ?? "");
  const [billingAddress, setBillingAddress] = useState(
    coach.billing_address ?? ""
  );
  // Retour de la connexion Google (?google=...) : affiche la cause au lieu
  // d'échouer en silence.
  const [googleMsg, setGoogleMsg] = useState<
    "notconfigured" | "error" | null
  >(null);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("google");
    if (v === "notconfigured" || v === "error") setGoogleMsg(v);
  }, []);
  const [avatarUrl, setAvatarUrl] = useState(coach.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Section du dernier enregistrement : le feedback ne s'affiche que là.
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);

  // Upload de la photo de profil vers le Storage (avatars/<uid>/avatar).
  async function uploadAvatar(file: File) {
    setAvatarError(null);
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setAvatarError(t("settings.photoErr"));
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${coach.id}/avatar`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setAvatarError(t("settings.photoErr"));
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-buster : l'URL est stable, on force le rafraîchissement.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      await supabase
        .from("coaches")
        .update({ avatar_url: url })
        .eq("id", coach.id);
      setAvatarUrl(url);
      router.refresh();
    } catch {
      setAvatarError(t("settings.photoErr"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(section: string) {
    setError(null);
    setSaved(false);
    setFeedbackFor(section);
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
          refund_over_24h_pct: refundOver,
          refund_under_24h_pct: refundUnder,
          booking_mode: bookingMode,
          sport: sport || null,
          specialties,
          venues,
          gym_name: gymName.trim() || null,
          timezone,
          min_notice_hours: minNotice,
          business_name: businessName.trim() || null,
          siret: siret.trim() || null,
          vat_number: vatNumber.trim() || null,
          billing_address: billingAddress.trim() || null,
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
      {/* Lien public : ouvrir + copier en un clic */}
      {coach.slug && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/[0.04] px-4 py-3">
          <Link
            href={`/${coach.slug}`}
            target="_blank"
            className="flex min-w-0 flex-1 items-center justify-between gap-2 transition-opacity hover:opacity-80"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-base">
                {t("settings.viewPublic")}
              </span>
              <span className="block truncate text-xs font-semibold text-accent">
                madger.app/{coach.slug}
              </span>
            </span>
            <svg className="shrink-0 text-accent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H8M17 7v9" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://madger.app/${coach.slug}`);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 1800);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {linkCopied ? t("topbar.copied") : t("topbar.copy")}
          </button>
        </div>
      )}

      <SettingsSection
        icon={<UserIcon size={18} />}
        title={t("settings.profileSection")}
        desc={t("settings.profileDesc")}
        defaultOpen
      >
        {/* Photo de profil */}
        <div className="mt-4 flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full border border-border-strong object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent">
              {(firstName.charAt(0) + (lastName.charAt(0) || "")).toUpperCase() || "?"}
            </span>
          )}
          <div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent disabled:opacity-60"
            >
              {uploading ? t("settings.photoUploading") : t("settings.photoChange")}
            </button>
            {avatarError && (
              <p role="alert" className="mt-1 text-xs text-danger">{avatarError}</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = "";
            }}
          />
        </div>

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

          {error && feedbackFor === "profile" && <p role="alert" className="text-sm text-danger">{error}</p>}
          {saved && feedbackFor === "profile" && <p className="text-sm text-accent">{t("settings.saved")}</p>}

          <Button onClick={() => handleSave("profile")} disabled={loading} className="mt-1 self-start">
            {loading ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </SettingsSection>

      {/* Mon activité : sport, accompagnements, lieux d'exercice */}
      <SettingsSection
        icon={<ActivityIcon size={18} />}
        title={t("settings.activitySection")}
        desc={t("settings.activityDesc")}
      >
        <div className="flex flex-col gap-4">
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

          <div>
            <p className={labelClass}>{t("settings.specialtiesLabel")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPECIALTY_KEYS.map((s) => {
                const active = specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setSpecialties((prev) =>
                        active ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {t(`clientOnboarding.goals.${s}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className={labelClass}>{t("settings.venuesLabel")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {VENUE_KEYS.map((v) => {
                const active = venues.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setVenues((prev) =>
                        active ? prev.filter((x) => x !== v) : [...prev, v]
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {t(`taxonomy.venues.${v}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nom de la salle : répond au « chez Basic Fit ou Fitness Park ? » */}
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

          <div className="flex items-center gap-3">
            <Button onClick={() => handleSave("activity")} disabled={loading} className="self-start">
              {loading ? t("settings.saving") : t("settings.save")}
            </Button>
            {error && feedbackFor === "activity" && <p role="alert" className="text-sm text-danger">{error}</p>}
            {saved && feedbackFor === "activity" && <p className="text-sm text-accent">{t("settings.saved")}</p>}
          </div>
        </div>
      </SettingsSection>

      {/* Mode de réservation */}
      <SettingsSection
        icon={<ZapIcon size={18} />}
        title={t("settings.bookingSection")}
        desc={t("settings.bookingSectionDesc")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["instant", "approval"] as const).map((mode) => {
            const active = bookingMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setBookingMode(mode)}
                className={`flex flex-col rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/[0.06]"
                    : "border-border-strong hover:border-accent/40"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-base">
                    {t(`settings.bookingMode.${mode}`)}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      active ? "border-accent bg-accent" : "border-border-strong"
                    }`}
                  />
                </span>
                <span className="mt-1 text-xs text-text-dim">
                  {t(`settings.bookingMode.${mode}Desc`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Délai minimum de réservation (et limite d'acceptation) */}
        <div className="mt-4 border-t border-border pt-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.minNotice")}</span>
            <select
              value={minNotice}
              onChange={(e) => setMinNotice(Number(e.target.value))}
              className={inputClass}
            >
              {[1, 2, 6, 12, 24, 48].map((h) => (
                <option key={h} value={h}>
                  {h} h {t("settings.minNoticeBefore")}
                </option>
              ))}
            </select>
            <span className="text-xs text-text-dim">
              {t("settings.minNoticeHint")}
            </span>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => handleSave("booking")} disabled={loading} className="self-start">
            {loading ? t("settings.saving") : t("settings.save")}
          </Button>
          {error && feedbackFor === "booking" && <p role="alert" className="text-sm text-danger">{error}</p>}
          {saved && feedbackFor === "booking" && <p className="text-sm text-accent">{t("settings.saved")}</p>}
        </div>
      </SettingsSection>

      {/* Politique d'annulation */}
      <SettingsSection
        icon={<ShieldIcon size={18} />}
        title={t("cancellation.title")}
        desc={t("cancellation.subtitle")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 rounded-xl border border-border-strong p-4">
            <span className="text-sm font-semibold text-text-base">
              {t("cancellation.overLabel")}
            </span>
            <span className="text-xs text-text-dim">
              {t("cancellation.overDesc")}
            </span>
            <select
              value={refundOver}
              onChange={(e) => setRefundOver(Number(e.target.value))}
              className={`${inputClass} mt-2`}
              aria-label={t("cancellation.overLabel")}
            >
              {REFUND_PCT_CHOICES.map((p) => (
                <option key={p} value={p}>
                  {p} % {t("cancellation.refundedSuffix")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 rounded-xl border border-border-strong p-4">
            <span className="text-sm font-semibold text-text-base">
              {t("cancellation.underLabel")}
            </span>
            <span className="text-xs text-text-dim">
              {t("cancellation.underDesc")}
            </span>
            <select
              value={refundUnder}
              onChange={(e) => setRefundUnder(Number(e.target.value))}
              className={`${inputClass} mt-2`}
              aria-label={t("cancellation.underLabel")}
            >
              {REFUND_PCT_CHOICES.map((p) => (
                <option key={p} value={p}>
                  {p} % {t("cancellation.refundedSuffix")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Aperçu : exactement ce que verront les clients avant de payer. */}
        <div className="mt-4 max-w-sm rounded-xl border border-border bg-bg-elevated p-4">
          <PolicyTiers policy={{ overPct: refundOver, underPct: refundUnder }} />
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

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => handleSave("cancellation")} disabled={loading} className="self-start">
            {loading ? t("cancellation.saving") : t("cancellation.save")}
          </Button>
          {error && feedbackFor === "cancellation" && (
            <p role="alert" className="text-sm text-danger">{error}</p>
          )}
          {saved && feedbackFor === "cancellation" && (
            <p className="text-sm text-accent">{t("settings.saved")}</p>
          )}
        </div>
      </SettingsSection>

      {/* Facturation : mentions légales affichées sur chaque facture */}
      <SettingsSection
        icon={<FileTextIcon size={18} />}
        title={t("settings.billingSection")}
        desc={t("settings.billingDesc")}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("settings.businessName")}
              value={businessName}
              onChange={setBusinessName}
            />
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("settings.siretLabel")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
                className={inputClass}
              />
            </label>
          </div>
          <Field
            label={t("settings.billingAddress")}
            value={billingAddress}
            onChange={setBillingAddress}
          />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.vatNumber")}</span>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="FR12345678901"
              className={inputClass}
            />
            <span className="text-xs text-text-dim">
              {t("settings.vatHint")}
            </span>
          </label>

          <p className="rounded-xl border border-accent/20 bg-accent/[0.04] px-4 py-3 text-xs leading-relaxed text-text-muted">
            {t("settings.billingCompliance")}
          </p>

          <div className="flex items-center gap-3">
            <Button onClick={() => handleSave("billing")} disabled={loading} className="self-start">
              {loading ? t("settings.saving") : t("settings.save")}
            </Button>
            {error && feedbackFor === "billing" && <p role="alert" className="text-sm text-danger">{error}</p>}
            {saved && feedbackFor === "billing" && <p className="text-sm text-accent">{t("settings.saved")}</p>}
          </div>
        </div>
      </SettingsSection>

      {/* Préférences (langue, fuseau horaire, Google) */}
      <SettingsSection
        icon={<SlidersIcon size={18} />}
        title={t("settings.prefsSection")}
        desc={t("settings.prefsDesc")}
      >
        <p className="text-sm text-text-muted">{t("settings.language")}</p>
        <div className="mt-3">
          <LanguagePicker />
        </div>

        {/* Google Calendar + Meet */}
        <div className="mt-5 border-t border-border pt-4">
          <p className={labelClass}>{t("settings.googleTitle")}</p>
          <p className="mt-1 text-xs text-text-dim">
            {t("settings.googleHint")}
          </p>
          {googleMsg && (
            <p className="mt-2 rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-xs text-warning">
              {googleMsg === "notconfigured"
                ? t("settings.googleNotConfigured")
                : t("settings.googleError")}
            </p>
          )}
          {coach.google_connected_at ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("settings.googleConnected")}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/google/disconnect", { method: "POST" });
                  router.refresh();
                }}
                className="text-xs font-medium text-text-dim transition-colors hover:text-danger"
              >
                {t("settings.googleDisconnect")}
              </button>
            </div>
          ) : (
            <a
              href="/api/google/connect"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent"
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              {t("settings.googleConnect")}
            </a>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("settings.timezone")}</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <span className="text-xs text-text-dim">
              {t("settings.timezoneHint")}
            </span>
          </label>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={() => handleSave("prefs")} disabled={loading} className="self-start">
              {loading ? t("settings.saving") : t("settings.save")}
            </Button>
            {error && feedbackFor === "prefs" && <p role="alert" className="text-sm text-danger">{error}</p>}
            {saved && feedbackFor === "prefs" && <p className="text-sm text-accent">{t("settings.saved")}</p>}
          </div>
        </div>
      </SettingsSection>
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
