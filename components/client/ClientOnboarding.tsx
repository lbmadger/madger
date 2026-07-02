"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";
import { bmi, bmiCategory, GOAL_KEYS } from "@/lib/health/bmi";

// Création du profil sportif client en 3 étapes, avec barre de progression
// (style HelloFresh) : 1. identité → 2. mesures (IMC en direct) → 3. objectifs.
// Le profil est visible par les coachs avec qui le client échange.

const TOTAL_STEPS = 3;

export default function ClientOnboarding() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const rawRedirect = params.get("redirect") || "/coachs";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/coachs";

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "">("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Pré-remplit si le profil existe déjà (édition).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: p } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
        setPhone(p.phone ?? "");
        setBirthDate(p.birth_date ?? "");
        setSex(p.sex ?? "");
        setHeightCm(p.height_cm ? String(p.height_cm) : "");
        setWeightKg(p.weight_kg ? String(p.weight_kg) : "");
        setGoals(p.goals ?? []);
        setLevel(p.level ?? "");
        setNote(p.note ?? "");
      } else {
        // Prénom depuis les métadonnées du compte si dispo.
        const meta = user.user_metadata?.full_name as string | undefined;
        if (meta) setFirstName(meta.split(" ")[0] ?? "");
      }
    });
  }, []);

  const liveBmi = bmi(parseFloat(weightKg), parseInt(heightCm, 10));

  function toggleGoal(g: string) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function next() {
    setError(null);
    if (step === 0 && !firstName.trim())
      return setError(t("clientOnboarding.errors.nameRequired"));
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  async function save() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/onboarding-client");
        return;
      }
      const { error: err } = await supabase.from("client_profiles").upsert({
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        birth_date: birthDate || null,
        sex: sex || null,
        height_cm: heightCm ? parseInt(heightCm, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        goals,
        level: level || null,
        note: note.trim() || null,
        completed: true,
        updated_at: new Date().toISOString(),
      });
      if (err) {
        setError(t("clientOnboarding.errors.generic"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("clientOnboarding.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  // ── Écran final : IMC + CTA ───────────────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl">
          💪
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
          {t("clientOnboarding.doneTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
          {t("clientOnboarding.doneDesc")}
        </p>
        {liveBmi && (
          <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-border bg-bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {t("clientOnboarding.bmi.label")}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-accent">{liveBmi}</p>
            <p className="text-sm text-text-muted">
              {t(`clientOnboarding.bmi.${bmiCategory(liveBmi)}`)}
            </p>
          </div>
        )}
        <div className="mt-7 flex flex-col gap-2">
          <Button className="w-full" onClick={() => router.push(redirect)}>
            {t("clientOnboarding.findCoach")}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/espace")}>
            {t("clientSpace.title")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      {/* Barre de progression (segments + Étape X/3) */}
      <div className="mb-6">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-accent" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-text-dim">
          {t("clientOnboarding.step")} {step + 1}/{TOTAL_STEPS}
        </p>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {step === 0 && t("clientOnboarding.step1Title")}
        {step === 1 && t("clientOnboarding.step2Title")}
        {step === 2 && t("clientOnboarding.step3Title")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {t("clientOnboarding.subtitle")}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {/* ── Étape 1 : identité ─────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("clientOnboarding.firstName")}</span>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("clientOnboarding.lastName")}</span>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("clientOnboarding.phone")}</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </label>
          </>
        )}

        {/* ── Étape 2 : mesures + IMC en direct ──────────────────────────── */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("clientOnboarding.height")}</span>
                <input type="number" inputMode="numeric" min={100} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("clientOnboarding.weight")}</span>
                <input type="number" inputMode="decimal" step="0.5" min={30} max={300} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{t("clientOnboarding.birthDate")}</span>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  {t("clientOnboarding.sex")}{" "}
                  <span className="text-text-dim">{t("clientOnboarding.sexOptional")}</span>
                </span>
                <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)} className={inputClass}>
                  <option value="">—</option>
                  <option value="male">{t("clientOnboarding.sexes.male")}</option>
                  <option value="female">{t("clientOnboarding.sexes.female")}</option>
                  <option value="other">{t("clientOnboarding.sexes.other")}</option>
                </select>
              </label>
            </div>

            {/* IMC calculé en direct */}
            {liveBmi && (
              <div className="flex items-center justify-between rounded-xl border border-accent/25 bg-accent/[0.05] px-4 py-3">
                <span className="text-sm text-text-muted">
                  {t("clientOnboarding.bmiLive")}
                </span>
                <span className="text-lg font-extrabold text-accent">
                  {liveBmi}
                  <span className="ml-2 text-xs font-medium text-text-muted">
                    {t(`clientOnboarding.bmi.${bmiCategory(liveBmi)}`)}
                  </span>
                </span>
              </div>
            )}
          </>
        )}

        {/* ── Étape 3 : objectifs ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div>
              <p className={labelClass}>{t("clientOnboarding.goalsLabel")}</p>
              <p className="mt-0.5 text-xs text-text-dim">
                {t("clientOnboarding.goalsHint")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GOAL_KEYS.map((g) => {
                  const active = goals.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGoal(g)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border-strong text-text-muted hover:text-text-base"
                      }`}
                    >
                      {t(`clientOnboarding.goals.${g}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={labelClass}>{t("clientOnboarding.levelLabel")}</p>
              <div className="mt-2 flex gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      level === l
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-strong text-text-muted hover:text-text-base"
                    }`}
                  >
                    {t(`clientOnboarding.levels.${l}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("clientOnboarding.noteLabel")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("clientOnboarding.notePlaceholder")}
                className={`${inputClass} resize-none`}
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Navigation */}
        <div className="mt-2 flex gap-2">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} className="flex-1">
              {t("clientOnboarding.back")}
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button type="button" onClick={next} className="flex-1">
              {t("clientOnboarding.next")}
            </Button>
          ) : (
            <Button type="button" onClick={save} disabled={loading} className="flex-1">
              {loading ? t("clientOnboarding.saving") : t("clientOnboarding.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
