"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/SessionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SHARE_OPEN_EVENT } from "@/components/dashboard/TopbarActions";

// Carte « Partage ton lien » : affichée quand une page du dashboard est vide
// faute de clients (messages sans conversation). Le lien, un bouton copier,
// WhatsApp, et « Plus d'options » qui ouvre le menu Partager de la topbar.
export default function ShareLinkCard({ title, desc }: { title: string; desc: string }) {
  const { slug } = useSession();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!slug) return null;
  const link = `https://madger.app/${slug}`;
  const message = t("topbar.shareMessage").replace("{link}", link);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-accent/25 bg-accent/[0.05] p-5">
      <p className="text-base font-semibold text-text-base">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{desc}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-accent">madger.app/{slug}</span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            {copied ? t("topbar.copied") : t("topbar.copy")}
          </button>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-border-strong px-4 py-2.5 text-center text-sm font-medium text-text-base transition-colors hover:border-accent sm:flex-none"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(SHARE_OPEN_EVENT))}
            className="flex-1 rounded-full border border-border-strong px-4 py-2.5 text-sm font-medium text-text-base transition-colors hover:border-accent sm:flex-none"
          >
            {t("topbar.share")}
          </button>
        </div>
      </div>
    </section>
  );
}
