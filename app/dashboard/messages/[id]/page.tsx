import { notFound } from "next/navigation";
import MessageThread from "@/components/messaging/MessageThread";
import ClientSheet from "@/components/messaging/ClientSheet";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/lib/messaging/types";
import type { ClientProfile } from "@/lib/health/bmi";

// Fil de discussion côté coach. La RLS garantit l'accès uniquement si le coach
// est participant de la conversation.
export default async function CoachThreadPage({
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

  // Les 100 derniers messages suffisent à l'affichage initial (le fil
  // complet n'est jamais chargé d'un bloc, même sur une vieille relation).
  const [{ data: msgs }, { data: profile }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: false })
      .limit(100),
    // Fiche sportive du client (RLS : lisible car conversation partagée).
    supabase
      .from("client_profiles")
      .select("*")
      .eq("id", conversation.client_id)
      .maybeSingle(),
  ]);

  // Ouvrir le fil = tout marquer comme lu côté coach (best-effort, la
  // colonne peut ne pas exister tant que 0041 n'est pas passée).
  await supabase
    .from("conversations")
    .update({ coach_last_read_at: new Date().toISOString() })
    .eq("id", params.id);

  return (
    <MessageThread
      conversationId={conversation.id}
      currentUserId={user.id}
      otherName={conversation.client_name || "-"}
      backPath="/dashboard/messages"
      sessionsHref="/dashboard/agenda"
      initialMessages={((msgs ?? []) as Message[]).slice().reverse()}
      headerExtra={
        profile ? <ClientSheet profile={profile as ClientProfile} /> : undefined
      }
    />
  );
}
