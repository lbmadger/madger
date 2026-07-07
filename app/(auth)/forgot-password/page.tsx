"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Mot de passe oublié : envoie l'email de réinitialisation Supabase. Le lien
// revient sur /auth/callback qui pose la session puis redirige /reset-password.
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/reset-password")}`,
      });
      if (err) setError(t("auth.errors.generic"));
      else setSent(true);
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-14">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {t("auth.forgot.title")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{t("auth.forgot.desc")}</p>

      {sent ? (
        <p className="mt-6 rounded-xl border border-accent/20 bg-accent/[0.05] p-4 text-sm text-text-base">
          {t("auth.forgot.sent")}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("auth.emailLabel")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? t("common.loading") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </p>
    </div>
  );
}
