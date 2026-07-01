import Topbar from "@/components/dashboard/Topbar";
import StripeConnectButton from "@/components/dashboard/payments/StripeConnectButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Page Paiements : connexion Stripe du coach (encaissement direct, 0% Madger).
export default async function PaymentsPage() {
  const { dict } = getServerDictionary();
  const pay = dict.payments;
  const { coach } = await getCoach();

  const stripe = getStripe();

  // Rafraîchit l'état du compte connecté depuis Stripe (charges_enabled).
  let chargesEnabled = coach?.stripe_charges_enabled ?? false;
  const accountId = coach?.stripe_account_id ?? null;
  if (stripe && accountId && coach) {
    try {
      const acct = await stripe.accounts.retrieve(accountId);
      chargesEnabled = acct.charges_enabled;
      if (chargesEnabled !== coach.stripe_charges_enabled) {
        const supabase = createClient();
        await supabase
          .from("coaches")
          .update({ stripe_charges_enabled: chargesEnabled })
          .eq("id", coach.id);
      }
    } catch {
      /* ignore */
    }
  }

  // État : configuré ? connecté ? en attente ? pas encore branché ?
  const state = !stripe
    ? "not_configured"
    : chargesEnabled
    ? "connected"
    : accountId
    ? "pending"
    : "connect";

  return (
    <>
      <Topbar title={pay.title} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {state === "connected" ? (
          <section className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-black">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h2 className="text-lg font-bold text-text-base">
                {pay.connectedTitle}
              </h2>
            </div>
            <p className="text-sm text-text-muted">{pay.connectedDesc}</p>
            <p className="mt-4 text-xs text-text-dim">{pay.feesNote}</p>
          </section>
        ) : state === "pending" ? (
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="text-lg font-bold text-text-base">
              {pay.pendingTitle}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{pay.pendingDesc}</p>
            <div className="mt-5">
              <StripeConnectButton label={pay.finishSetup} />
            </div>
          </section>
        ) : state === "connect" ? (
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="text-lg font-bold text-text-base">
              {pay.connectTitle}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{pay.connectDesc}</p>
            <div className="mt-5">
              <StripeConnectButton label={pay.connect} />
            </div>
            <p className="mt-4 text-xs text-text-dim">{pay.feesNote}</p>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <p className="text-sm text-text-muted">{pay.notConfigured}</p>
          </section>
        )}
      </main>
    </>
  );
}
