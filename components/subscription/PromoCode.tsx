"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";

// Saisie + validation d'un code promo (accès anticipé → mois de Pro offerts).
export default function PromoCode({ compact }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);

  async function redeem() {
    setError(null);
    if (!code.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("redeem_promo", {
        p_code: code.trim(),
      });
      if (error) {
        const m = error.message || "";
        if (m.includes("invalid_code")) setError(t("promo.errors.invalid"));
        else if (m.includes("code_exhausted"))
          setError(t("promo.errors.exhausted"));
        else setError(t("promo.errors.generic"));
        return;
      }
      setUntil(data as string);
      router.refresh();
    } catch {
      setError(t("promo.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (until) {
    const d = new Date(until).toLocaleDateString(
      locale === "fr" ? "fr-FR" : "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm text-text-base">
        {t("promo.success")} <span className="font-semibold">{d}</span>.
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-border bg-bg-card p-5"}>
      {!compact && (
        <>
          <h3 className="text-base font-semibold text-text-base">
            {t("promo.title")}
          </h3>
          <p className="mt-1 text-sm text-text-muted">{t("promo.desc")}</p>
        </>
      )}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("promo.placeholder")}
          className="w-full rounded-full border border-border-strong bg-white/[0.03] px-4 py-2.5 text-base uppercase tracking-wide text-text-base outline-none transition-colors placeholder:text-text-dim placeholder:normal-case focus:border-accent"
        />
        <Button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="shrink-0 px-5 py-2.5"
        >
          {loading ? t("promo.redeeming") : t("promo.redeem")}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
