import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { newMessageNotif } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
// Une notification max par destinataire et par conversation toutes les 30 min.
const THROTTLE_MS = 30 * 60 * 1000;

// Notifie l'autre participant d'une conversation qu'un message vient d'être
// envoyé. Appelée par l'expéditeur après l'envoi ; le serveur vérifie qu'il
// participe bien à la conversation et choisit le destinataire.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const conversationId = body.conversation_id as string | undefined;
  if (!conversationId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: conv } = await admin
    .from("conversations")
    .select(
      "id, coach_id, client_id, coach_name, client_name, coach_notified_at, client_notified_at"
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (user.id !== conv.coach_id && user.id !== conv.client_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // L'expéditeur est le compte connecté → on notifie l'autre participant.
  const toCoach = user.id === conv.client_id;
  const lastNotified = toCoach
    ? (conv.coach_notified_at as string | null)
    : (conv.client_notified_at as string | null);
  if (
    lastNotified &&
    Date.now() - new Date(lastNotified).getTime() < THROTTLE_MS
  ) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  // Dernier message (aperçu) : celui de l'expéditeur.
  const { data: lastMsg } = await admin
    .from("messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recipientId = toCoach ? conv.coach_id : conv.client_id;
  const { data: recipient } = await admin.auth.admin.getUserById(
    recipientId as string
  );
  const email = recipient?.user?.email;
  if (!email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tpl = newMessageNotif({
    senderName:
      (toCoach ? (conv.client_name as string) : (conv.coach_name as string)) ||
      (toCoach ? "Un client" : "Ton coach"),
    preview: (lastMsg?.body as string) || "",
    threadUrl: toCoach
      ? `${APP_URL}/dashboard/messages/${conversationId}`
      : `${APP_URL}/messages/${conversationId}`,
  });
  // reply-to : répondre à l'email écrit à l'expéditeur, pas à Madger.
  let replyTo: string | undefined;
  try {
    const senderId = toCoach ? conv.client_id : conv.coach_id;
    const { data: sender } = await admin.auth.admin.getUserById(
      senderId as string
    );
    replyTo = sender?.user?.email ?? undefined;
  } catch {
    /* best-effort */
  }
  const sent = await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    replyTo,
  });

  if (sent) {
    await admin
      .from("conversations")
      .update(
        toCoach
          ? { coach_notified_at: new Date().toISOString() }
          : { client_notified_at: new Date().toISOString() }
      )
      .eq("id", conversationId);
  }

  return NextResponse.json({ ok: true });
}
