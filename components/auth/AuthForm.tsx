"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PASSWORD_RULES, isPasswordStrong } from "@/lib/utils/password";
import Button from "@/components/ui/Button";
import { inputClass } from "@/lib/ui/styles";

type Mode = "login" | "signup";
type Method = "email" | "phone";

// Formulaire d'auth login/signup. Deux méthodes : email (mot de passe +
// confirmation par lien) ou SMS (code à usage unique via OTP). Google en plus.

export default function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Rôle du compte créé : 'client' si ?role=client (parcours client après
  // réservation), sinon 'coach' (espace coach par défaut).
  const role = searchParams.get("role") === "client" ? "client" : "coach";
  const redirectTo =
    searchParams.get("redirect") ||
    (role === "client" ? "/messages" : "/dashboard");

  const isSignup = mode === "signup";

  const [method, setMethod] = useState<Method>("email");

  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Téléphone (OTP)
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configOk = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  function normalizePhone(v: string): string {
    return v.replace(/[\s().-]/g, "");
  }

  // ── Email ────────────────────────────────────────────────────────────────
  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    if (isSignup && !isPasswordStrong(password))
      return setError(t("auth.errors.passwordWeak"));

    setLoading(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role },
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) return setError(t("auth.errors.generic"));
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setEmailSent(true);
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return setError(t("auth.errors.invalidCredentials"));
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  // ── Téléphone (SMS / OTP) ─────────────────────────────────────────────────
  async function sendCode() {
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    const p = normalizePhone(phone);
    if (!/^\+[0-9]{8,15}$/.test(p)) return setError(t("auth.errors.phoneInvalid"));

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: p,
        // À l'inscription, on crée le compte si besoin ; à la connexion non.
        options: { shouldCreateUser: isSignup, data: { role } },
      });
      if (error) return setError(t("auth.errors.otpFailed"));
      setCodeSent(true);
    } catch {
      setError(t("auth.errors.otpFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: code.trim(),
        type: "sms",
      });
      if (error) return setError(t("auth.errors.invalidCode"));
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(t("auth.errors.invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) setError(t("auth.errors.generic"));
    } catch {
      setError(t("auth.errors.generic"));
    }
  }

  // ── État "vérifie ta boîte mail" (lien de confirmation) ────────────────────
  if (emailSent) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-base">
          {t("auth.signup.checkEmailTitle")}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {t("auth.signup.checkEmailDesc")}
        </p>
      </div>
    );
  }

  const titleKey = isSignup ? "auth.signup" : "auth.login";

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {t(`${titleKey}.title`)}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{t(`${titleKey}.subtitle`)}</p>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border-strong bg-bg-elevated px-4 py-3 text-sm font-medium text-text-base transition-all hover:border-white/20 hover:bg-bg-card active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        {t("auth.googleContinue")}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase text-text-dim">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Sélecteur Email / SMS */}
      <div className="mb-4 flex rounded-full border border-border p-0.5">
        {(["email", "phone"] as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              setError(null);
            }}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              method === m
                ? "bg-accent text-black"
                : "text-text-muted hover:text-text-base"
            }`}
          >
            {t(`auth.method.${m}`)}
          </button>
        ))}
      </div>

      {method === "email" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("auth.emailLabel")}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("auth.passwordLabel")}
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className={inputClass}
            />
          </label>

          {isSignup && (
            <ul className="-mt-1 flex flex-col gap-1.5">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      ok ? "text-accent" : "text-text-dim"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {ok ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="9" strokeWidth="1.6" />}
                    </svg>
                    {t(rule.labelKey)}
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? t("auth.signingIn") : t(`${titleKey}.submit`)}
          </Button>
        </form>
      ) : !codeSent ? (
        // Étape 1 : saisie du numéro
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("auth.phone.label")}
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("auth.phone.placeholder")}
              autoComplete="tel"
              className={inputClass}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button onClick={sendCode} disabled={loading} className="mt-2 w-full">
            {loading ? t("auth.phone.sending") : t("auth.phone.send")}
          </Button>
        </div>
      ) : (
        // Étape 2 : saisie du code reçu par SMS
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            {t("auth.phone.sentTo")}{" "}
            <span className="font-medium text-text-base">{phone}</span>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-muted">
              {t("auth.phone.codeLabel")}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("auth.phone.codePlaceholder")}
              autoComplete="one-time-code"
              className={`${inputClass} text-center text-lg tracking-[0.4em]`}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? t("auth.phone.verifying") : t("auth.phone.verify")}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setCodeSent(false); setCode(""); setError(null); }} className="text-text-muted hover:text-text-base">
              {t("auth.phone.changeNumber")}
            </button>
            <button type="button" onClick={sendCode} className="font-medium text-accent hover:underline">
              {t("auth.phone.resend")}
            </button>
          </div>
        </form>
      )}

      {/* Bascule login/signup */}
      <p className="mt-5 text-center text-sm text-text-muted">
        {isSignup ? t("auth.signup.haveAccount") : t("auth.login.noAccount")}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-accent hover:underline"
        >
          {isSignup ? t("auth.signup.link") : t("auth.login.link")}
        </Link>
      </p>
    </div>
  );
}
