import { notFound } from "next/navigation";
import MessageThread from "@/components/messaging/MessageThread";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/messaging/types";

// Fil de discussion côté client (RLS : participant uniquement).
export default async function ClientThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!conv || !user) {
    notFound();
  }
  const conversation = conv as Conversation;

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <MessageThread
      conversationId={conversation.id}
      currentUserId={user.id}
      otherName={conversation.coach_name || "-"}
      backPath="/messages"
      initialMessages={(msgs ?? []) as Message[]}
    />
  );
}
