import Topbar from "@/components/dashboard/Topbar";
import StripeConnectButton from "@/components/dashboard/payments/StripeConnectButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { isPro } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

// Page Paiements : connexion Stripe du coach. La note de frais dépend du plan
// réel : Pro = 0 % de commission Madger, Gratuit = 5 %.
export default async function PaymentsPage() {
  const { dict } = getServerDictionary();
  const pay = dict.payments;
  const { coach } = await getCoach();
  const feesNote = isPro(coach?.pro_until) ? pay.feesNotePro : pay.feesNoteFree;

  const stripe = getStripe();

  // Rafraîchit l'état du compte connecté depuis Stripe, seulement tant que
  // les paiements ne sont pas actifs (une fois actifs, inutile d'appeler
  // Stripe à chaque affichage).
  let chargesEnabled = coach?.stripe_charges_enabled ?? false;
  const accountId = coach?.stripe_account_id ?? null;
  if (stripe && accountId && coach && !chargesEnabled) {
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

  // Historique : encaissements, séquestres en cours, versements, litiges.
  const supabase = createClient();
  const { data: history } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, currency, paid_at, escrow_status, release_after, payout_cents, refunded_cents, commission_cents, clients(first_name, last_name)"
    )
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(30);

  const euros = (cents: number) =>
    (cents / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });
  const escrowChip: Record<string, { label: string; cls: string }> = {
    held: {
      label: pay.escrowHeld,
      cls: "bg-warning/10 text-warning",
    },
    released: { label: pay.escrowReleased, cls: "bg-accent/10 text-accent" },
    refunded: {
      label: pay.escrowRefunded,
      cls: "border border-border-strong text-text-muted",
    },
    canceled: {
      label: pay.escrowCanceled,
      cls: "border border-border-strong text-text-muted",
    },
    disputed: { label: pay.escrowDisputed, cls: "bg-danger/10 text-danger" },
  };

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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {state === "connected" ? (
          <section className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-black">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-text-base">
                {pay.connectedTitle}
              </h2>
            </div>
            <p className="text-sm text-text-muted">{pay.connectedDesc}</p>
            <p className="mt-4 text-xs text-text-dim">{feesNote}</p>
          </section>
        ) : state === "pending" ? (
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="text-base font-semibold text-text-base">
              {pay.pendingTitle}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{pay.pendingDesc}</p>
            <div className="mt-5">
              <StripeConnectButton label={pay.finishSetup} />
            </div>
          </section>
        ) : state === "connect" ? (
          <section className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="text-base font-semibold text-text-base">
              {pay.connectTitle}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{pay.connectDesc}</p>
            <div className="mt-5">
              <StripeConnectButton label={pay.connect} />
            </div>
            <p className="mt-4 text-xs text-text-dim">{feesNote}</p>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <p className="text-sm text-text-muted">{pay.notConfigured}</p>
          </section>
        )}

        {/* Historique des paiements et versements */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {pay.historyTitle}
          </h2>
          {(history ?? []).length === 0 ? (
            <p className="mt-3 rounded-2xl border border-border bg-bg-card p-6 text-center text-sm text-text-muted">
              {pay.historyEmpty}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {(history ?? []).map((p) => {
                const cl = Array.isArray(p.clients) ? p.clients[0] : p.clients;
                const chip = escrowChip[p.escrow_status as string];
                const refundedCents = (p.refunded_cents as number | null) ?? 0;
                return (
                  <li
                    key={p.id as string}
                    className="rounded-2xl border border-border bg-bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-base">
                          {[cl?.first_name, cl?.last_name]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {new Date(p.paid_at as string).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              timeZone: "Europe/Paris",
                            }
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-text-base">
                          {euros((p.amount_cents as number) || 0)}
                        </p>
                        {chip && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}
                          >
                            {chip.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 border-t border-border pt-2 text-xs text-text-dim">
                      {p.escrow_status === "held" && p.release_after
                        ? `${pay.releasePlanned} ${new Date(p.release_after as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`
                        : p.escrow_status === "released"
                        ? `${pay.netPaid} ${euros((p.payout_cents as number) || 0)}${((p.commission_cents as number) || 0) > 0 ? ` · ${pay.commissionLabel} ${euros((p.commission_cents as number) || 0)}` : ""}`
                        : refundedCents > 0
                        ? `${pay.refundedLabel} ${euros(refundedCents)}${(p.payout_cents as number) > 0 ? ` · ${pay.netPaid} ${euros((p.payout_cents as number) || 0)}` : ""}`
                        : pay.escrowDisputedNote && p.escrow_status === "disputed"
                        ? pay.escrowDisputedNote
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
