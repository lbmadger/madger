import Topbar from "@/components/dashboard/Topbar";
import ConversationList from "@/components/messaging/ConversationList";
import ShareLinkCard from "@/components/dashboard/ShareLinkCard";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
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

  // Photo de profil du client : elle vit dans Auth (compte Google → avatar),
  // pas dans la base. Lecture via l'API admin, best-effort, initiale sinon.
  const avatars: Record<string, string> = {};
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && (data ?? []).length > 0) {
    const admin = createAdmin(SUPABASE_URL, serviceKey);
    await Promise.all(
      (data ?? []).slice(0, 40).map(async (c) => {
        try {
          const { data: u } = await admin.auth.admin.getUserById(
            c.client_id as string
          );
          const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
          const url = (meta.avatar_url || meta.picture) as string | undefined;
          if (url) avatars[c.id as string] = url;
        } catch {
          /* pas de photo : initiale */
        }
      })
    );
  }

  return (
    <>
      <Topbar title={dict.messages.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Aucune conversation : le remède, c'est le lien qui circule. */}
        {(data ?? []).length === 0 && (
          <ShareLinkCard title={dict.messages.shareTitle} desc={dict.messages.fewHintCoach} />
        )}
        <ConversationList
          conversations={(data ?? []) as Conversation[]}
          perspective="coach"
          basePath="/dashboard/messages"
          previews={previews}
        avatars={avatars}
        />
      </main>
    </>
  );
}
