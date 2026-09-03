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
import { googleCalendarUrl, icsUrl } from "@/lib/calendar/links";

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
  // Séance fictive demain 18h-19h : les boutons calendrier du test pointent
  // sur un vrai événement ajoutable, pas sur une date passée.
  const demoStart = new Date(Date.now() + 24 * 3600 * 1000);
  demoStart.setHours(18, 0, 0, 0);
  const demoEvent = {
    title: "Séance avec Alex Martin",
    start: demoStart,
    end: new Date(demoStart.getTime() + 3600 * 1000),
    details: `Ma réservation : ${APP_URL}/reservation/demo`,
    location: "Basic-Fit Lyon Part-Dieu · 93 rue de la Villette, Lyon",
  };
  const samples = [
    bookingConfirmationClient({
      coachName: "Alex Martin",
      dateStr,
      priceStr: "50,00 €",
      online: false,
      reservationUrl: `${APP_URL}/reservation/demo`,
      placeStr: "Basic-Fit Lyon Part-Dieu · 93 rue de la Villette, Lyon",
      // Boutons calendrier avec une vraie séance de démo, pour tester
      // l'ajout depuis l'email (Google + fichier .ics Apple/Outlook).
      calendarUrl: googleCalendarUrl(demoEvent),
      icsUrl: icsUrl(demoEvent),
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
