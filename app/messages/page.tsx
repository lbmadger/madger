import ConversationList from "@/components/messaging/ConversationList";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Conversation } from "@/lib/messaging/types";

// Messagerie côté client : ses conversations avec des coachs.
export default async function ClientMessagesPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("client_id", user?.id ?? "")
    .order("last_message_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-tight text-text-base">
        {dict.messages.title}
      </h1>
      <ConversationList
        conversations={(data ?? []) as Conversation[]}
        perspective="client"
        basePath="/messages"
      />
    </main>
  );
}
