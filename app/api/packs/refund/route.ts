import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sendEmail } from "@/lib/email/resend";
import { packRefundClient } from "@/lib/email/templates";
import { emailInvoice } from "@/lib/invoices/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

// Le COACH rembourse le reste d'un pack (décision commerciale : client qui
// déménage, blessure…). Prorata des crédits non consommés sur le prix payé,
// plafonné par ce qui n'a été ni versé au coach ni déjà remboursé. Le pack
// est clôturé, un avoir est émis et envoyé, et le séquestre restant part au
// coach au prochain passage du cron (le paiement reste « held », les
// séances déjà faites lui reviennent).
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const packId = body.pack_id as string | undefined;
  if (!packId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdmin(SUPABASE_URL, serviceKey);
  const { data: pack } = await admin
    .from("pack_credits")
    .select("id, coach_id, client_id, payment_id, total, used, status")
    .eq("id", packId)
    .maybeSingle();
  if (!pack || pack.coach_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (pack.status !== "active") {
    return NextResponse.json({ error: "pack_inactive" }, { status: 409 });
  }
  const remaining = Math.max(0, (pack.total as number) - (pack.used as number));
  if (remaining === 0) {
    return NextResponse.json({ error: "nothing_to_refund" }, { status: 409 });
  }
  if (!pack.payment_id) {
    return NextResponse.json({ error: "no_payment" }, { status: 409 });
  }

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, client_id, amount_cents, currency, stripe_charge_id, escrow_status, released_cents, refunded_cents"
    )
    .eq("id", pack.payment_id)
    .maybeSingle();
  if (!payment || !payment.stripe_charge_id) {
    return NextResponse.json({ error: "no_payment" }, { status: 409 });
  }
  if (payment.escrow_status === "disputed") {
    return NextResponse.json({ error: "disputed" }, { status: 409 });
  }
  // Seul un paiement encore sous séquestre est remboursable par la
  // plateforme : une fois versé (released) ou soldé (canceled), il ne reste
  // que les frais de transaction, qui ne sont pas au client.
  if (payment.escrow_status !== "held") {
    return NextResponse.json({ error: "not_refundable" }, { status: 409 });
  }

  const amount = payment.amount_cents as number;
  const alreadyReleased = (payment.released_cents as number | null) ?? 0;
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
  const wanted = Math.round((amount * remaining) / (pack.total as number));
  // Fonds déjà versés au coach : non remboursables par la plateforme (le
  // coach rembourse alors depuis son compte Stripe s'il le souhaite).
  const refund = Math.min(wanted, Math.max(0, amount - alreadyReleased - alreadyRefunded));
  if (refund <= 0) {
    return NextResponse.json({ error: "nothing_refundable" }, { status: 409 });
  }
  const totalRefunded = alreadyRefunded + refund;

  // Réclame le montant AVANT l'appel Stripe (anti double clic / cron).
  const { data: claimed } = await admin
    .from("payments")
    .update({
      refunded_cents: totalRefunded,
      // Le cron repasse dès cette nuit pour verser le reste au coach.
      release_after: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("refunded_cents", alreadyRefunded)
    .select("id");
  if (!claimed?.length) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    await stripe.refunds.create(
      { charge: payment.stripe_charge_id as string, amount: refund },
      { idempotencyKey: `packrefund_${pack.id}_${refund}` }
    );
  } catch (e) {
    await admin
      .from("payments")
      .update({ refunded_cents: alreadyRefunded })
      .eq("id", payment.id)
      .eq("refunded_cents", totalRefunded);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe_error" },
      { status: 500 }
    );
  }
  if (totalRefunded >= amount) {
    await admin
      .from("payments")
      .update({ escrow_status: "refunded", status: "refunded", resolved_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("escrow_status", "held");
  }

  // Pack clôturé, avoir émis et envoyé, client prévenu (best-effort).
  try {
    await admin.rpc("close_pack_credit", {
      p_pack: pack.id,
      p_status: "refunded",
      p_actor: "coach",
      p_note: `${remaining} séance(s) remboursée(s) par le coach`,
    });
    const { data: noteId } = await admin.rpc("create_credit_note", {
      p_payment: payment.id,
      p_total_refunded_cents: totalRefunded,
      p_reason: "Remboursement du reste du pack par le coach",
    });
    await emailInvoice(admin, noteId as string | null);

    const [{ data: client }, { data: coach }] = await Promise.all([
      admin.from("clients").select("email").eq("id", pack.client_id).maybeSingle(),
      admin.from("coaches").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    ]);
    if (client?.email) {
      const tpl = packRefundClient({
        coachName:
          [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") || "Ton coach",
        refundStr: (refund / 100).toLocaleString("fr-FR", {
          style: "currency",
          currency: ((payment.currency as string) || "eur").toUpperCase(),
        }),
        remaining,
        spaceUrl: `${APP_URL}/espace`,
      });
      await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, refunded_cents: refund, remaining });
}
