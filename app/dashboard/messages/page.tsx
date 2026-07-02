import Topbar from "@/components/dashboard/Topbar";
import ConversationList from "@/components/messaging/ConversationList";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Conversation } from "@/lib/messaging/types";

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

  return (
    <>
      <Topbar title={dict.messages.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ConversationList
          conversations={(data ?? []) as Conversation[]}
          perspective="coach"
          basePath="/dashboard/messages"
        />
      </main>
    </>
  );
}
