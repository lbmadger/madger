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

// Formulaire d'auth login/signup. Compte = email + mot de passe (uniquement).
// À l'inscription, vérification par lien de confirmation envoyé par email.
// Google en option.

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configOk = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  async function handleSubmit(e: FormEvent) {
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
        // Confirmation email active → pas de session immédiate : on invite à
        // vérifier la boîte mail. Sinon, on entre directement.
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

  async function handleGoogle() {
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}&as=${role}`,
        },
      });
      if (error) setError(t("auth.errors.generic"));
    } catch {
      setError(t("auth.errors.generic"));
    }
  }

  // État "vérifie ta boîte mail" (lien de confirmation envoyé).
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
