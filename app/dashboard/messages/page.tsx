import Topbar from "@/components/dashboard/Topbar";
import ConversationList from "@/components/messaging/ConversationList";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Conversation } from "@/lib/messaging/types";


// Dernier message de chaque conversation (aperçu dans la liste). Un seul
// aller-retour : les 200 messages les plus récents couvrent largement les
// conversations affichées, on garde le premier vu par conversation.
async function lastMessagePreviews(
  supabase: ReturnType<typeof createClient>,
  conversationIds: string[],
  meId: string | undefined
): Promise<Record<string, { body: string; mine: boolean }>> {
  if (conversationIds.length === 0) return {};
  const { data } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(200);
  const previews: Record<string, { body: string; mine: boolean }> = {};
  for (const m of data ?? []) {
    const cid = m.conversation_id as string;
    if (!previews[cid]) {
      previews[cid] = {
        body: (m.body as string) ?? "",
        mine: m.sender_id === meId,
      };
    }
  }
  return previews;
}

// Messagerie côté coach : liste des conversations avec ses clients.
export default async function CoachMessagesPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("coach_id", user?.id ?? "")
    .order("last_message_at", { ascending: false });
  const previews = await lastMessagePreviews(
    supabase,
    (data ?? []).map((c) => c.id as string),
    user?.id
  );

  return (
    <>
      <Topbar title={dict.messages.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ConversationList
          conversations={(data ?? []) as Conversation[]}
          perspective="coach"
          basePath="/dashboard/messages"
          previews={previews}
        />
      </main>
    </>
  );
}
