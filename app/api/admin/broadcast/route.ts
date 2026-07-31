import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/email/resend";
import { waitlistIntro, waitlistStory } from "@/lib/email/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Campagnes email vers la liste d'attente, déclenchées depuis /admin/emails.
// Idempotent : chaque inscrit porte un horodatage par campagne (migration
// 0050), rejouer le bouton n'envoie jamais deux fois. Mode test : un seul
// exemplaire vers l'email de l'admin connecté, sans rien marquer.
const CAMPAIGNS = {
  intro: { column: "intro_sent_at", template: waitlistIntro },
  story: { column: "story_sent_at", template: waitlistStory },
} as const;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    campaign?: string;
    test?: boolean;
  } | null;
  const campaign = CAMPAIGNS[body?.campaign as keyof typeof CAMPAIGNS];
  if (!campaign) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 400 });
  }
  const tpl = campaign.template();

  if (body?.test) {
    const ok = await sendEmail({
      to: user.email as string,
      subject: `[TEST] ${tpl.subject}`,
      html: tpl.html,
    });
    return NextResponse.json({ test: true, sent: ok ? 1 : 0 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const admin = createServiceClient(SUPABASE_URL, serviceKey);
  const { data: rows, error } = await admin
    .from("early_access")
    .select("id, email")
    .is(campaign.column, null)
    .limit(500);
  if (error) {
    // Colonne absente = migration 0050 pas encore passée : mieux qu'un 500 muet.
    return NextResponse.json(
      { error: `db: ${error.message.slice(0, 200)}` },
      { status: 500 }
    );
  }

  let sent = 0;
  for (const r of rows ?? []) {
    const email = (r.email as string | null)?.trim();
    if (!email) continue;
    const ok = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    if (ok) {
      await admin
        .from("early_access")
        .update({ [campaign.column]: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    }
  }

  return NextResponse.json({ sent, total: (rows ?? []).length });
}
