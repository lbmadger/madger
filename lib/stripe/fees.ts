import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// Frais Stripe réels d'un paiement. Ils sont normalement lus à
// l'encaissement (balance transaction de la charge) et stockés dans
// payments.stripe_fee_cents. Si la valeur est absente ou à 0 (balance
// transaction pas encore disponible au moment du fulfillment, ancien
// paiement…), on la relit chez Stripe AVANT de verser : sans ça, le coach
// recevrait le montant plein et la plateforme porterait les frais.
export async function ensureStripeFee(
  admin: SupabaseClient,
  stripe: Stripe,
  payment: { id: string; stripe_charge_id: string | null; stripe_fee_cents: number | null }
): Promise<number> {
  const known = payment.stripe_fee_cents ?? 0;
  if (known > 0 || !payment.stripe_charge_id) return known;
  try {
    const charge = await stripe.charges.retrieve(payment.stripe_charge_id, {
      expand: ["balance_transaction"],
    });
    const bt =
      charge.balance_transaction && typeof charge.balance_transaction !== "string"
        ? charge.balance_transaction
        : null;
    const fee = bt?.fee ?? 0;
    if (fee > 0) {
      await admin
        .from("payments")
        .update({ stripe_fee_cents: fee })
        .eq("id", payment.id);
    }
    return fee;
  } catch {
    return known;
  }
}
