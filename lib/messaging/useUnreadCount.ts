"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Nombre de conversations non lues pour l'utilisateur courant. Recalculé à
// chaque changement de route (donc juste après avoir ouvert un fil, le badge
// se met à jour). Même règle que la liste : non lu = dernier message venu de
// l'autre ET plus récent que ma dernière lecture. Deux requêtes légères.
export function useUnreadCount(): number {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: convs } = await supabase
        .from("conversations")
        .select(
          "id, coach_id, last_message_at, coach_last_read_at, client_last_read_at"
        )
        .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`);

      if (!convs || convs.length === 0) {
        if (!cancelled) setCount(0);
        return;
      }

      const ids = convs.map((c) => c.id as string);
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);

      // Dernier expéditeur par conversation (messages triés du + récent au +
      // ancien : le premier vu par conversation est le dernier message).
      const lastSender: Record<string, string> = {};
      for (const m of msgs ?? []) {
        const cid = m.conversation_id as string;
        if (!lastSender[cid]) lastSender[cid] = m.sender_id as string;
      }

      let n = 0;
      for (const c of convs) {
        const sender = lastSender[c.id as string];
        // Dernier message envoyé par moi (ou aucun message) → jamais non lu.
        if (!sender || sender === user.id) continue;
        const iAmCoach = c.coach_id === user.id;
        const readAt = iAmCoach ? c.coach_last_read_at : c.client_last_read_at;
        if (
          !readAt ||
          new Date(c.last_message_at as string).getTime() >
            new Date(readAt as string).getTime()
        ) {
          n++;
        }
      }
      if (!cancelled) setCount(n);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return count;
}
