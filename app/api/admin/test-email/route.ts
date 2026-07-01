import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  bookingConfirmationClient,
  bookingNotificationCoach,
  sessionReminderClient,
  refundClient,
  payoutReleasedCoach,
  disputeOpenedAdmin,
} from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Envoie un exemplaire de chaque email transactionnel à une adresse, pour test.
// Réservé aux admins (ADMIN_EMAILS).
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "resend_not_configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const to = (body.to as string | undefined)?.trim() || user.email!;

  const dateStr = "jeudi 3 juillet à 18:00";
  const samples = [
    bookingConfirmationClient({
      coachName: "Alex Martin",
      dateStr,
      priceStr: "50,00 €",
      online: false,
      reservationUrl: `${APP_URL}/reservation/demo`,
    }),
    bookingNotificationCoach({
      clientName: "Camille Dupont",
      dateStr,
      serviceName: "Séance individuelle",
      priceStr: "50,00 €",
      online: false,
      dashboardUrl: `${APP_URL}/dashboard/agenda`,
    }),
    sessionReminderClient({
      coachName: "Alex Martin",
      dateStr,
      online: true,
      reservationUrl: `${APP_URL}/reservation/demo`,
    }),
    refundClient({
      coachName: "Alex Martin",
      refundStr: "37,50 €",
      reason: "cancellation",
    }),
    payoutReleasedCoach({
      clientName: "Camille Dupont",
      payoutStr: "47,10 €",
      dashboardUrl: `${APP_URL}/dashboard/paiements`,
    }),
    disputeOpenedAdmin({
      clientName: "Camille Dupont",
      coachName: "Alex Martin",
      amountStr: "50,00 €",
      reason: "La séance n'a pas eu lieu, le coach ne s'est pas présenté.",
      adminUrl: `${APP_URL}/admin/litiges`,
    }),
  ];

  let sent = 0;
  for (const s of samples) {
    const ok = await sendEmail({ to, subject: `[TEST] ${s.subject}`, html: s.html });
    if (ok) sent++;
  }

  return NextResponse.json({ sent, total: samples.length, to });
}
