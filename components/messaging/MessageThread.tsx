"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Message } from "@/lib/messaging/types";

// Fil de discussion partagé (coach et client). Charge les messages, se
// rafraîchit toutes les 4 s (simple et fiable, sans config realtime), et
// envoie via le client navigateur (RLS : participant uniquement).
export default function MessageThread({
  conversationId,
  currentUserId,
  otherName,
  backPath,
  initialMessages,
  headerExtra,
}: {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  backPath: string;
  initialMessages: Message[];
  // Bloc optionnel affiché sous l'en-tête (ex. fiche client côté coach).
  headerExtra?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Chargement INCRÉMENTAL : on ne demande que les messages plus récents que
  // le dernier reçu (au lieu de re-télécharger tout le fil toutes les 4 s).
  const lastSeenRef = useRef<string | null>(
    initialMessages.length
      ? initialMessages[initialMessages.length - 1].created_at
      : null
  );
  const fetchMessages = useCallback(async () => {
    if (document.hidden) return;
    const supabase = createClient();
    let q = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (lastSeenRef.current) q = q.gt("created_at", lastSeenRef.current);
    const { data } = await q;
    if (data && data.length > 0) {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const fresh = (data as Message[]).filter((m) => !seen.has(m.id));
        if (fresh.length === 0) return prev;
        lastSeenRef.current = fresh[fresh.length - 1].created_at;
        return [...prev, ...fresh];
      });
    }
  }, [conversationId]);

  // Rafraîchissement périodique tant que le fil est ouvert et visible.
  useEffect(() => {
    const id = setInterval(fetchMessages, 4000);
    const onVisible = () => {
      if (!document.hidden) fetchMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchMessages]);

  // Auto-scroll en bas à l'arrivée de nouveaux messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: text,
      });
      if (error) {
        setBody(text); // restaure en cas d'échec
      } else {
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* En-tête du fil */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href={backPath}
          className="text-text-muted transition-colors hover:text-text-base"
          aria-label="back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
          {otherName.charAt(0).toUpperCase() || "?"}
        </span>
        <span className="font-semibold text-text-base">{otherName}</span>
      </div>

      {headerExtra}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "self-end bg-accent text-black"
                    : "self-start border border-border bg-bg-card text-text-base"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("messages.placeholder")}
          className="flex-1 rounded-full border border-border-strong bg-white/[0.03] px-4 py-2.5 text-base text-text-base outline-none transition-colors placeholder:text-text-dim focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label={t("messages.send")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
