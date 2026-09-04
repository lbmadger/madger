"use client";

import Link from "next/link";
import Leo from "@/components/ui/Leo";
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

  // Horodatage façon WhatsApp : l'heure si le message date d'aujourd'hui,
  // « hier » si c'est hier, la date sinon. Fuseau du navigateur : c'est le
  // lecteur qui regarde sa liste.
  function timeLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, now)) {
      return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(d, yesterday)) return t("messages.yesterday");
    return d.toLocaleDateString(loc, { day: "2-digit", month: "short" });
  }

  // Conversation non lue : le dernier message vient de l'autre ET est plus
  // récent que ma dernière lecture (ou je n'ai jamais ouvert le fil).
  function isUnread(c: Conversation): boolean {
    const preview = previews[c.id];
    if (!preview || preview.mine) return false;
    const readAt =
      perspective === "coach" ? c.coach_last_read_at : c.client_last_read_at;
    if (!readAt) return true;
    return new Date(c.last_message_at).getTime() > new Date(readAt).getTime();
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
        <Leo pose="ok" size={84} className="mx-auto mb-4" />
        <h3 className="text-base font-semibold text-text-base">
          {t("messages.emptyTitle")}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
          {t("messages.emptyDesc")}
        </p>
        {/* Côté client, une conversation naît depuis une page coach : on y
            emmène au lieu de laisser un cul-de-sac. */}
        {perspective === "client" && (
          <Link
            href="/coachs"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("clientSpace.findCoach")}
          </Link>
        )}
      </div>
    );
  }

  // Une liste d'une ou deux conversations laisse un grand vide sous elle :
  // on le meuble d'un rappel discret qui pousse la bonne action (le lien).
  const fewHint =
    perspective === "coach" && conversations.length <= 2 ? (
      <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-text-dim">
        {t("messages.fewHintCoach")}
      </p>
    ) : null;

  return (
    <>
    <ul className="flex flex-col gap-2">
      {conversations.map((c) => {
        const name =
          (perspective === "coach" ? c.client_name : c.coach_name) || "-";
        const initial = name.charAt(0).toUpperCase() || "?";
        const unread = isUnread(c);
        return (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              aria-label={unread ? `${name} · ${t("messages.unread")}` : name}
              className={`flex items-center gap-3 p-3 ${interactiveCardClass}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    unread
                      ? "font-bold text-text-base"
                      : "font-medium text-text-base"
                  }`}
                >
                  {name}
                </span>
                {previews[c.id] && (
                  <span
                    className={`mt-0.5 block truncate text-xs ${
                      unread ? "font-semibold text-text-base" : "text-text-muted"
                    }`}
                  >
                    {previews[c.id].mine ? `${t("messages.you")} ` : ""}
                    {previews[c.id].body}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] text-text-dim">
                  {timeLabel(c.last_message_at)}
                </span>
                {unread && (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
    {fewHint}
    </>
  );
}
