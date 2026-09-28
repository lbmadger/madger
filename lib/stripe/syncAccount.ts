import type Stripe from "stripe";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NO_STORE } from "@/lib/supabase/noStore";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { getStripe } from "@/lib/stripe/server";

// État réel du compte Stripe Connect d'un coach, recopié en base
// (stripe_charges_enabled est protégé par la RLS : service role). Stripe
// valide souvent l'identité quelques heures après l'onboarding : sans cette
// recopie, le coach reste invisible dans l'annuaire sans le savoir, ou à
// l'inverse continue d'encaisser alors que Stripe a coupé.
function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? createAdmin(SUPABASE_URL, serviceKey, NO_STORE) : null;
}

// Depuis le webhook Connect (account.updated) : aucun appel Stripe, l'objet
// est dans l'événement.
export async function applyStripeAccount(account: Stripe.Account): Promise<void> {
  const db = admin();
  if (!db || !account.id) return;
  await db
    .from("coaches")
    .update({ stripe_charges_enabled: Boolean(account.charges_enabled) })
    .eq("stripe_account_id", account.id);
}

// Depuis le dashboard (repli si le webhook Connect n'est pas configuré) :
// un appel Stripe, seulement tant que les paiements ne sont pas actifs.
export async function syncStripeChargesEnabled(
  coachId: string,
  accountId: string,
  current: boolean
): Promise<boolean> {
  const stripe = getStripe();
  const db = admin();
  if (!stripe || !db) return current;
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    const enabled = Boolean(acct.charges_enabled);
    if (enabled !== current) {
      await db.from("coaches").update({ stripe_charges_enabled: enabled }).eq("id", coachId);
    }
    return enabled;
  } catch {
    return current;
  }
}
