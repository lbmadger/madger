"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";
import { PASSWORD_RULES, isPasswordStrong } from "@/lib/utils/password";

// Nouveau mot de passe (arrivée depuis le lien email — session déjà posée par
// /auth/callback). Mêmes règles de robustesse qu'à l'inscription.
export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordStrong(password))
      return setError(t("auth.errors.passwordWeak"));
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(t("auth.errors.generic"));
        return;
      }
      setOkMsg(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {t("auth.reset.title")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{t("auth.reset.desc")}</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("auth.passwordLabel")}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

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

        {error && <p className="text-sm text-danger">{error}</p>}
        {okMsg && <p className="text-sm text-accent">{t("auth.reset.success")}</p>}

        <Button type="submit" disabled={loading || okMsg} className="mt-1 w-full">
          {loading ? t("common.loading") : t("auth.reset.submit")}
        </Button>
      </form>
    </div>
  );
}
