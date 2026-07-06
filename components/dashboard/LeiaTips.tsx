"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  SparklesIcon,
  LightbulbIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import type { LeiaTip } from "@/lib/leia/tips";

// Bande fine « Les conseils de Leia » en haut du dashboard : fermée, elle
// montre le nombre de conseils et un aperçu ; un clic déplie tous les
// conseils personnalisés (lib/leia/tips.ts) + le conseil du jour.
export default function LeiaTips({
  tips,
  dailyIndex,
}: {
  tips: LeiaTip[];
  dailyIndex: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const preview =
    tips.length > 0
      ? t(`leia.tips.${tips[0].id}.title`)
      : t(`leia.daily.d${dailyIndex + 1}`);

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-accent/25 bg-bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/[0.04]"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
        >
          <SparklesIcon size={14} />
        </span>
        <span className="shrink-0 text-sm font-semibold text-text-base">
          {t("leia.title")}
        </span>
        {tips.length > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">
            {tips.length}
          </span>
        )}
        <span className="hidden min-w-0 flex-1 truncate text-xs text-text-muted sm:block">
          {preview}
        </span>
        <ChevronDownIcon
          size={15}
          className={`ml-auto shrink-0 text-text-dim transition-transform duration-200 sm:ml-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="border-t border-border px-4 pb-4 pt-3">
              {tips.length === 0 ? (
                <p className="text-xs leading-relaxed text-text-muted">
                  {t("leia.allGood")}
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {tips.map((tip) => (
                    <li
                      key={tip.id}
                      className="rounded-lg border border-border bg-bg-elevated p-3"
                    >
                      <p className="text-xs font-semibold text-text-base">
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
                    </li>
                  ))}
                </ul>
              )}

              {/* Conseil du jour */}
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                  <LightbulbIcon
                    size={12}
                    className="mr-1.5 inline-block align-[-2px]"
                  />
                  {t("leia.dailyTitle")}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {t(`leia.daily.d${dailyIndex + 1}`)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
