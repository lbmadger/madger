"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { interactiveCardClass } from "@/lib/ui/styles";
import type { Conversation } from "@/lib/messaging/types";

// Liste de conversations, réutilisée côté coach et côté client.
// `perspective` détermine quel nom afficher (l'autre participant) et le lien.
export default function ConversationList({
  conversations,
  perspective,
  basePath,
  previews = {},
}: {
  conversations: Conversation[];
  perspective: "coach" | "client";
  basePath: string; // "/dashboard/messages" ou "/messages"
  // Dernier message par conversation : { corps, envoyé par moi ? }.
  previews?: Record<string, { body: string; mine: boolean }>;
}) {
  const { t, locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
        <h3 className="text-base font-semibold text-text-base">
          {t("messages.emptyTitle")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          {t("messages.emptyDesc")}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => {
        const name =
          (perspective === "coach" ? c.client_name : c.coach_name) || "-";
        const initial = name.charAt(0).toUpperCase() || "?";
        return (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              className={`flex items-center gap-3 p-3 ${interactiveCardClass}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-base">
                  {name}
                </span>
                {previews[c.id] && (
                  <span className="mt-0.5 block truncate text-xs text-text-muted">
                    {previews[c.id].mine ? `${t("messages.you")} ` : ""}
                    {previews[c.id].body}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-text-dim">
                {new Date(c.last_message_at).toLocaleDateString(loc, {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
