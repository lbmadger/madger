import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { packRefundClient } from "@/lib/email/templates";
import { emailInvoice } from "@/lib/invoices/send";
import { packProrata, packRefundableUnits, packPaidTotal } from "@/lib/packs/prorata";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

export type PackRefundOutcome =
  | { ok: true; refund_cents: number; remaining: number }
  | {
      ok: false;
      error:
        | "not_found"
        | "pack_inactive"
        | "nothing_to_refund"
        | "no_payment"
        | "disputed"
        | "not_refundable"
        | "nothing_refundable"
        | "already_processed"
        | "stripe_error";
      detail?: string;
    };

// Rembourse au client le reste d'un pack : prorata des séances PAYÉES non
// consommées sur le prix payé, plafonné par ce qui n'a été ni versé au coach
// ni déjà remboursé. Le pack est clôturé, un avoir est émis et envoyé, le
// client est prévenu. Utilisé par le coach (fiche client), par le cron
// (demande sans réponse sous 7 jours, coach parti) et partagé pour que les
// trois chemins fassent exactement la même chose.
export async function refundPackRemainder(
  admin: SupabaseClient,
  stripe: Stripe,
  p: {
    packId: string;
    actor: "coach" | "system";
    // Motif journalisé et porté sur l'avoir.
    note: string;
    // Formulation de l'email client : geste du coach, ou remboursement
    // automatique (demande restée sans réponse, coach parti).
    mode: "coach" | "no_answer" | "coach_offline";
  }
): Promise<PackRefundOutcome> {
  const { data: pack } = await admin
    .from("pack_credits")
    .select("id, coach_id, client_id, payment_id, total, paid_total, used, status")
    .eq("id", p.packId)
    .maybeSingle();
  if (!pack) return { ok: false, error: "not_found" };
  if (pack.status !== "active") return { ok: false, error: "pack_inactive" };
  const remaining = Math.max(0, (pack.total as number) - (pack.used as number));
  if (remaining === 0) return { ok: false, error: "nothing_to_refund" };
  if (!pack.payment_id) return { ok: false, error: "no_payment" };

  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, client_id, amount_cents, currency, stripe_charge_id, escrow_status, released_cents, refunded_cents"
    )
    .eq("id", pack.payment_id)
    .maybeSingle();
  if (!payment || !payment.stripe_charge_id) return { ok: false, error: "no_payment" };
  if (payment.escrow_status === "disputed") return { ok: false, error: "disputed" };
  // Seul un paiement encore sous séquestre est remboursable par la
  // plateforme : une fois versé ou soldé, il ne reste que les frais.
  if (payment.escrow_status !== "held") return { ok: false, error: "not_refundable" };

  const amount = payment.amount_cents as number;
  const alreadyReleased = (payment.released_cents as number | null) ?? 0;
  const alreadyRefunded = (payment.refunded_cents as number | null) ?? 0;
  const paidUnits = packRefundableUnits(
    pack.total as number,
    pack.used as number,
    pack.paid_total as number | null,
    false
  );
  const wanted = packProrata(
    amount,
    paidUnits,
    packPaidTotal(pack.total as number, pack.paid_total as number | null)
  );
  const refund = Math.min(wanted, Math.max(0, amount - alreadyReleased - alreadyRefunded));
  if (refund <= 0) return { ok: false, error: "nothing_refundable" };
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
  if (!claimed?.length) return { ok: false, error: "already_processed" };

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
    return {
      ok: false,
      error: "stripe_error",
      detail: e instanceof Error ? e.message : undefined,
    };
  }
  if (totalRefunded >= amount) {
    await admin
      .from("payments")
      .update({
        escrow_status: "refunded",
        status: "refunded",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("escrow_status", "held");
  }

  // Pack clôturé, demande soldée, avoir émis et envoyé, client prévenu
  // (best-effort : le remboursement est déjà parti).
  try {
    await admin.rpc("close_pack_credit", {
      p_pack: pack.id,
      p_status: "refunded",
      p_actor: p.actor,
      p_note: p.note,
    });
    await admin
      .from("pack_credits")
      .update({
        refund_request_status: p.mode === "coach" ? "accepted" : "auto",
        refund_responded_at: new Date().toISOString(),
      })
      .eq("id", pack.id)
      .eq("refund_request_status", "pending");
    const { data: noteId } = await admin.rpc("create_credit_note", {
      p_payment: payment.id,
      p_total_refunded_cents: totalRefunded,
      p_reason: p.note,
    });
    await emailInvoice(admin, noteId as string | null);

    const [{ data: client }, { data: coach }] = await Promise.all([
      admin.from("clients").select("email").eq("id", pack.client_id).maybeSingle(),
      admin
        .from("coaches")
        .select("first_name, last_name")
        .eq("id", pack.coach_id)
        .maybeSingle(),
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
        mode: p.mode,
      });
      await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html });
    }
  } catch {
    /* best-effort */
  }

  return { ok: true, refund_cents: refund, remaining };
}
