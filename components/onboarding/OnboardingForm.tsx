"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { startRouteProgress } from "@/components/ui/RouteProgress";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { slugify, isValidSlug } from "@/lib/utils/slug";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Leo from "@/components/ui/Leo";
import AccountSwitchBar from "@/components/auth/AccountSwitchBar";
import { inputClass, labelClass } from "@/lib/ui/styles";
import { SPORT_KEYS, defaultServiceForSport } from "@/lib/coaches/taxonomy";
import { WEEK_ORDER } from "@/lib/availability/types";
import { track } from "@/lib/analytics/posthog";

// Onboarding en 3 étapes : qui tu es → ce que tu proposes → quand tu es
// dispo. C'est le chemin le plus court vers le seul moment qui compte, le
// lien de réservation qui fonctionne.
//
// Tout ce qui n'est pas nécessaire à ce lien (photo, bio, ville, SIRET,
// objectifs, lieux) a quitté ce parcours : ces champs vivent dans Réglages,
// qui les couvrait déjà tous, et l'écran final y renvoie explicitement. Un
// formulaire vide n'est jamais présenté : le choix du sport pré-remplit la
// première prestation, et les disponibilités arrivent déjà cochées.

const TOTAL_STEPS = 3;
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

  const [step, setStep] = useState(1); // 1..3, 4 = écran final
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 : qui tu es
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  // La photo, dès l'étape 1 : la vue publique l'exige (public_coaches filtre
  // sur avatar_url), sans elle le lien renvoie une page introuvable. Elle
  // reste non bloquante ici, mais l'écran final dit la vérité si elle manque.
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarErr, setAvatarErr] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(
    slugify(`${initialFirstName} ${initialLastName}`)
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);

  // Étape 2 : ce que tu proposes
  const [sport, setSport] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState(60);
  // Le coach a-t-il touché au prix / à la durée ? Tant que non, un changement
  // de sport les recalcule ; dès qu'il a ajusté, on ne réécrit plus par-dessus.
  const [offerTouched, setOfferTouched] = useState(false);

  // Étape 3 : quand tu es dispo (pré-rempli : semaine 9 h – 18 h)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("18:00");

  const [copied, setCopied] = useState(false);

  // Upload immédiat vers avatars/<uid>/avatar (même chemin que Réglages),
  // puis écriture de l'URL sur la ligne coach. Best-effort : un échec ne
  // bloque jamais la progression.
  async function uploadAvatar(file: File) {
    setAvatarErr(false);
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setAvatarErr(true);
      return;
    }
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setAvatarErr(true);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("coaches")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (dbErr) {
        setAvatarErr(true);
        return;
      }
      setAvatarUrl(url);
    } catch {
      setAvatarErr(true);
    } finally {
      setAvatarUploading(false);
    }
  }

  function syncNames(next: { first?: string; last?: string }) {
    const f = next.first ?? firstName;
    const l = next.last ?? lastName;
    if (next.first !== undefined) setFirstName(next.first);
    if (next.last !== undefined) setLastName(next.last);
    if (!slugTouched) setSlug(slugify(`${f} ${l}`));
  }

  // Choisir son sport remplit l'offre : le coach n'affronte jamais trois
  // champs vides, il valide ou corrige une proposition.
  function pickSport(next: string) {
    setSport(next);
    if (offerTouched) return;
    const preset = defaultServiceForSport(next);
    setServiceName(t("onboarding.serviceDefaultName"));
    setServicePrice(String(preset.price));
    setServiceDuration(preset.duration);
  }

  // ── Étape 1 : identité (le coach et son lien existent dès cette étape) ────
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
          slug,
          // listed / onboarding_completed ne sont posés qu'à la FIN de
          // l'étape 3 : sinon un abandon à l'étape 2 publiait un profil
          // vide et rendait l'onboarding irrécupérable (redirigé dashboard).
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
      // Parrainage : rattache le filleul à son parrain (best-effort). Le code
      // vient du lien /signup?ref=CODE mémorisé à l'inscription.
      try {
        const ref = localStorage.getItem("madger_ref");
        if (ref) {
          await fetch("/api/referral/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: ref }),
          });
          localStorage.removeItem("madger_ref");
        }
      } catch {
        /* best-effort : le parrainage ne doit jamais bloquer l'onboarding */
      }
      track("onboarding_step_done", { step: 1 });
      setStep(2);
    } catch {
      setError(t("onboarding.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 2 : sport + première prestation, en une seule écriture ──────────
  async function submitOffer() {
    setError(null);
    if (!sport) return setError(t("onboarding.sportRequired"));
    const priceCents = Math.round(
      (parseFloat(servicePrice.replace(",", ".")) || 0) * 100
    );
    if (!serviceName.trim() || priceCents <= 0) {
      return setError(t("onboarding.serviceInvalid"));
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: sportErr } = await supabase
        .from("coaches")
        .update({ sport })
        .eq("id", userId);
      if (sportErr) {
        setError(t("onboarding.errors.generic"));
        return;
      }
      const { error: svcErr } = await supabase.from("services").insert({
        coach_id: userId,
        name: serviceName.trim(),
        type: "single",
        // Le lieu se précise dans Réglages : par défaut, une séance en
        // présentiel, le cas de très loin le plus fréquent.
        location: "in_person",
        duration_min: serviceDuration,
        price_cents: priceCents,
        currency: "eur",
        active: true,
      });
      if (svcErr) {
        setError(t("onboarding.errors.generic"));
        return;
      }
      track("onboarding_step_done", { step: 2 });
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 3 : disponibilités, puis le profil devient officiel ─────────────
  async function submitAvailability() {
    setError(null);
    if (days.length === 0 || dayEnd <= dayStart) {
      return setError(t("onboarding.availInvalid"));
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
      // C'est ICI que le profil devient officiel : publié + onboarding
      // terminé, une fois les 3 étapes réellement franchies.
      const { error: doneErr } = await supabase
        .from("coaches")
        .update({ listed: true, onboarding_completed: true })
        .eq("id", userId);
      if (doneErr) {
        setError(t("onboarding.errors.generic"));
        return;
      }
      track("onboarding_step_done", { step: 3 });
      track("onboarding_completed");
      setStep(4);
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

  const bookingUrl = `madger.app/${slug}`;

  // ── Écran final : le lien est en ligne, puis les marches suivantes ────────
  if (step === 4) {
    return (
      <div className="anim-scale-in rounded-2xl border border-border bg-bg-card p-6 text-center">
        <Leo size={56} className="mx-auto" />
        {/* Pas de fausse victoire : le lien n'est réellement visible qu'avec
            photo + paiements actifs (exigences de la vue publique). L'écran
            liste ce qui reste au lieu d'annoncer une mise en ligne mensongère. */}
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-text-base">
          {t("onboarding.readyTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t("onboarding.readySubtitle")}
        </p>

        {/* Le lien, en grand : c'est le produit. Il se copie en un geste. */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-left font-display text-sm font-bold text-accent hover:underline"
          >
            {bookingUrl}
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`https://${bookingUrl}`);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard refusé (http, permission) : le lien reste cliquable */
              }
            }}
            className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            {copied ? t("onboarding.copied") : t("onboarding.copyLink")}
          </button>
        </div>

        {/* Les vraies étapes restantes avant la mise en ligne effective. */}
        <div className="mt-5 rounded-xl border border-border p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t("onboarding.remainTitle")}
          </p>

          <div className="mt-3 flex items-center gap-2.5">
            {avatarUrl ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-black">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[10px] font-bold text-text-dim">
                1
              </span>
            )}
            <span className={`min-w-0 flex-1 text-sm ${avatarUrl ? "text-text-dim line-through" : "text-text-base"}`}>
              {avatarUrl
                ? t("onboarding.remainPhotoDone")
                : t("onboarding.remainPhoto")}
            </span>
            {!avatarUrl && (
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
                className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-base transition-colors hover:border-accent disabled:opacity-60"
              >
                {avatarUploading ? "…" : t("onboarding.remainPhotoCta")}
              </button>
            )}
          </div>
          {avatarErr && (
            <p role="alert" className="mt-1 pl-8 text-xs text-danger">
              {t("settings.photoErr")}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[10px] font-bold text-text-dim">
              {avatarUrl ? 1 : 2}
            </span>
            <span className="min-w-0 flex-1 text-sm text-text-base">
              {t("onboarding.remainStripe")}
            </span>
          </div>
          <Button
            onClick={() => {
              startRouteProgress();
              router.push("/dashboard/paiements");
              router.refresh();
            }}
            className="mt-3 w-full"
          >
            {t("onboarding.stripeCta")}
          </Button>

          {/* L'input photo doit exister aussi dans ce rendu (retour anticipé). */}
          <input
            ref={avatarInputRef}
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

        {/* Photo, bio et ville ont quitté le parcours : c'est ici qu'on les
            réclame, une fois la valeur déjà livrée. */}
        <div className="mt-3 rounded-xl border border-border p-4 text-left">
          <p className="text-sm font-semibold text-text-base">
            {t("onboarding.profileTitle")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t("onboarding.profileDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              startRouteProgress();
              router.push("/dashboard/reglages");
              router.refresh();
            }}
            className="mt-3 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-text-base transition-colors hover:border-accent"
          >
            {t("onboarding.profileCta")}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            startRouteProgress();
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
      title: t("onboarding.offerTitle"),
      subtitle: t("onboarding.offerSubtitle"),
    },
    3: {
      title: t("onboarding.availTitle"),
      subtitle: t("onboarding.availSubtitle"),
    },
  };

  return (
    <div>
      {/* Rappel du compte connecté + changement de compte (mauvais Google) */}
      <AccountSwitchBar />
      <div className="rounded-2xl border border-border bg-bg-card p-6">
        {/* Progression */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-text-dim">
            <span>
              {t("onboarding.stepLabel")} {step} {t("onboarding.of")}{" "}
              {TOTAL_STEPS}
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
        <p className="mt-1 text-sm text-text-muted">
          {stepTitles[step].subtitle}
        </p>

        {/* ── Étape 1 : qui tu es ── */}
        {step === 1 && (
          <form onSubmit={submitIdentity} className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("onboarding.firstName")}</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => syncNames({ first: e.target.value })}
                  className={inputClass}
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  {t("onboarding.lastName")}{" "}
                  <span className="font-normal text-text-dim">
                    {t("common.optional")}
                  </span>
                </span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => syncNames({ last: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            {/* La photo, tout de suite : la page publique l'exige pour être
                visible. Non bloquante, mais présentée comme essentielle. */}
            <div className="flex items-center gap-3 rounded-xl border border-border-strong p-3">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full border border-border-strong object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                  {(firstName.charAt(0) || "?").toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={labelClass}>{t("onboarding.photoLabel")}</p>
                <p className="mt-0.5 text-xs leading-snug text-text-dim">
                  {t("onboarding.photoHint")}
                </p>
                {avatarErr && (
                  <p role="alert" className="mt-0.5 text-xs text-danger">
                    {t("settings.photoErr")}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
                className="shrink-0 rounded-full border border-border-strong px-3.5 py-2 text-xs font-semibold text-text-base transition-colors hover:border-accent disabled:opacity-60"
              >
                {avatarUploading
                  ? "…"
                  : avatarUrl
                  ? t("onboarding.photoChange")
                  : t("onboarding.photoAdd")}
              </button>
              <input
                ref={avatarInputRef}
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

            {/* Le lien n'est pas un champ de plus : il se fabrique sous les
                yeux du coach, et ne devient éditable que s'il le demande. */}
            <div className="rounded-xl border border-border-strong p-3">
              <p className={labelClass}>{t("onboarding.linkPreview")}</p>
              {editingSlug ? (
                <>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                    className={`${inputClass} mt-1.5`}
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-text-dim">
                    {t("onboarding.slugHint")}
                  </p>
                </>
              ) : (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-accent">
                    {bookingUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingSlug(true)}
                    className="shrink-0 text-xs font-semibold text-text-muted underline transition-colors hover:text-text-base"
                  >
                    {t("onboarding.editLink")}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? t("onboarding.saving") : t("onboarding.next")}
            </Button>
          </form>
        )}

        {/* ── Étape 2 : ce que tu proposes ── */}
        {step === 2 && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("settings.sport")}</span>
              <div className="flex flex-wrap gap-2">
                {SPORT_KEYS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sport === s}
                    onClick={() => pickSport(s)}
                    className={chipClass(sport === s)}
                  >
                    {t(`taxonomy.sports.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* L'offre n'apparaît qu'une fois le sport choisi : un seul choix
                à faire à l'écran, et elle arrive déjà remplie. */}
            {sport && (
              <div className="anim-fade-up flex flex-col gap-4 rounded-xl border border-border-strong p-4">
                <p className="text-xs text-text-dim">
                  {t("onboarding.prefilledHint")}
                </p>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("services.form.name")}</span>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => {
                      setOfferTouched(true);
                      setServiceName(e.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>
                      {t("services.form.price")}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={servicePrice}
                      onChange={(e) => {
                        setOfferTouched(true);
                        setServicePrice(e.target.value);
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>
                      {t("services.form.duration")}
                    </span>
                    <select
                      value={serviceDuration}
                      onChange={(e) => {
                        setOfferTouched(true);
                        setServiceDuration(Number(e.target.value));
                      }}
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
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button
              onClick={submitOffer}
              disabled={loading || !sport}
              className="mt-2 w-full"
            >
              {loading ? t("onboarding.saving") : t("onboarding.next")}
            </Button>
          </div>
        )}

        {/* ── Étape 3 : quand tu es dispo ── */}
        {step === 3 && (
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

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button
              onClick={submitAvailability}
              disabled={loading}
              className="mt-2 w-full"
            >
              {loading ? t("onboarding.saving") : t("onboarding.finish")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
