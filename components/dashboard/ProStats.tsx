"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LockIcon } from "@/components/ui/icons";

export type ProStatItem = {
  label: string;
  value: string;
  hint?: string;
};

// Statistiques avancées, réservées au plan Pro. En Gratuit : tuiles floutées
// avec les VRAIES valeurs du coach (choix produit : « débloque TES chiffres »
// vend mieux qu'un décor) + cadenas + bouton vers l'abonnement. En Pro : net.
export default function ProStats({
  items,
  locked,
}: {
  items: ProStatItem[];
  locked: boolean;
}) {
  const { t } = useI18n();

  return (
    <section className="mt-4 rounded-2xl border border-border bg-bg-card p-4 sm:mt-5 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-dim">
          {t("overview.proStats.title")}
        </h3>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-black">
          PRO
        </span>
        {locked && <LockIcon size={13} className="text-text-dim" />}
      </div>

      <div className="relative mt-4">
        <div
          aria-hidden={locked}
          className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${
            locked ? "pointer-events-none select-none blur-[7px]" : ""
          }`}
        >
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-xl border border-border bg-bg-elevated p-3"
            >
              <p className="text-[11px] text-text-dim">{it.label}</p>
              <p className="mt-1 text-lg font-extrabold capitalize tracking-tight text-text-base">
                {it.value}
              </p>
              {it.hint && (
                <p className="mt-0.5 text-[10px] normal-case text-text-dim">
                  {it.hint}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-bg-card text-accent shadow-lg"
            >
              <LockIcon size={18} />
            </div>
            <p className="text-sm font-semibold text-text-base">
              {t("overview.proStats.lockedTitle")}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-text-muted">
              {t("overview.proStats.lockedDesc")}
            </p>
            <Link
              href="/dashboard/abonnement"
              className="mt-1 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              {t("overview.proStats.unlock")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
