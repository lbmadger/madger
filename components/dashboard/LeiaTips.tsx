"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { LeiaTip } from "@/lib/leia/tips";

const VISIBLE = 3;

// Carte « Les conseils de Leia » : conseils personnalisés calculés côté
// serveur (lib/leia/tips.ts), affichés 3 par 3, plus un conseil du jour qui
// tourne. Les textes viennent des dictionnaires (leia.*).
export default function LeiaTips({
  tips,
  dailyIndex,
}: {
  tips: LeiaTip[];
  dailyIndex: number;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tips : tips.slice(0, VISIBLE);

  return (
    <section className="rounded-2xl border border-accent/25 bg-bg-card p-5">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg"
        >
          ✨
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-base">
            {t("leia.title")}
          </h3>
          <p className="truncate text-xs text-text-dim">{t("leia.role")}</p>
        </div>
      </div>

      {tips.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-bg-elevated p-3 text-xs leading-relaxed text-text-muted">
          {t("leia.allGood")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visible.map((tip, i) => (
            <motion.li
              key={tip.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="rounded-lg border border-border bg-bg-elevated p-3"
            >
              <p className="text-xs font-semibold text-text-base">
                <span aria-hidden className="mr-1.5">
                  {tip.icon}
                </span>
                {t(`leia.tips.${tip.id}.title`)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {t(`leia.tips.${tip.id}.body`)}
              </p>
              {tip.href && (
                <Link
                  href={tip.href}
                  className="mt-1.5 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  {t(`leia.tips.${tip.id}.cta`)} ›
                </Link>
              )}
            </motion.li>
          ))}
        </ul>
      )}

      {tips.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs font-medium text-text-dim transition-colors hover:text-text-base"
        >
          {showAll ? t("leia.showLess") : `${t("leia.showAll")} (${tips.length})`}
        </button>
      )}

      {/* Conseil du jour (tourne chaque jour) */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
          💡 {t("leia.dailyTitle")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
          {t(`leia.daily.d${dailyIndex + 1}`)}
        </p>
      </div>
    </section>
  );
}
