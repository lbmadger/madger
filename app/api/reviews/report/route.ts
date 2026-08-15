import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { founderAlert } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// Signalement d'un avis par le coach (façon Vinted) : l'équipe Madger reçoit
// le contexte et tranche depuis /admin/avis (masquer ou laisser). RLS : le
// coach ne peut lire (donc signaler) que ses propres avis.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reviewId = typeof body?.review_id === "string" ? body.review_id : "";
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reviewId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // L'avis doit appartenir au coach connecté (la RLS filtre déjà, on borne).
  const { data: review } = await supabase
    .from("reviews")
    .select("id, rating, comment, coach_id")
    .eq("id", reviewId)
    .eq("coach_id", user.id)
    .maybeSingle();
  if (!review) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (process.env.FOUNDER_EMAIL) {
    try {
      const tpl = founderAlert({
        context: "Avis signalé par un coach (à trancher dans /admin/avis)",
        details: [
          `Avis : ${reviewId}`,
          `Coach : ${user.email ?? user.id}`,
          `Note : ${review.rating}/5`,
          `Commentaire : ${(review.comment as string | null) ?? "(vide)"}`,
          `Motif du coach : ${reason || "(non précisé)"}`,
        ],
      });
      await sendEmail({
        to: process.env.FOUNDER_EMAIL,
        subject: tpl.subject,
        html: tpl.html,
      });
    } catch {
      /* best-effort : le signalement ne doit pas échouer sur l'email */
    }
  }

  return NextResponse.json({ ok: true });
}
