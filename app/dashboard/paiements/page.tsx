import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import StripeConnectButton from "@/components/dashboard/payments/StripeConnectButton";
import StripeDashboardButton from "@/components/dashboard/payments/StripeDashboardButton";
import SiretForm from "@/components/dashboard/payments/SiretForm";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { getStripe } from "@/lib/stripe/server";
import { isPro } from "@/lib/subscription/plan";
import ProUpsellCard from "@/components/subscription/ProUpsellCard";

export const dynamic = "force-dynamic";

// Page Paiements : connexion Stripe du coach. La note de frais dépend du plan
// réel : frais de transaction au taux du plan (5 % Essentiel, 3 % Pro).
export default async function PaymentsPage() {
  const { dict, locale } = getServerDictionary();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
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
        // Colonne Stripe protégée par la RLS (0035) : service role requis.
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
          const admin = createAdmin(SUPABASE_URL, serviceKey);
          await admin
            .from("coaches")
            .update({ stripe_charges_enabled: chargesEnabled })
            .eq("id", coach.id);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Historique : encaissements, séquestres en cours, versements, litiges.
  const supabase = createClient();

  // Deux chiffres, calculés sur TOUS les paiements et pas sur les 30 lignes
  // affichées : ce qui est encaissé mais pas encore libéré, et ce qui est
  // réellement tombé sur le compte ce mois-ci. Le reste est du détail.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [heldRes, releasedRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents, release_after")
      .eq("escrow_status", "held")
      .not("paid_at", "is", null),
    supabase
      .from("payments")
      .select("payout_cents, commission_cents")
      .eq("escrow_status", "released")
      .gte("paid_at", monthStart.toISOString()),
  ]);

  const heldRows = heldRes.data ?? [];
  const heldTotal = heldRows.reduce(
    (sum, r) => sum + ((r.amount_cents as number) || 0),
    0
  );
  // Prochaine libération : la plus proche échéance parmi les séquestres.
  const nextRelease = heldRows
    .map((r) => r.release_after as string | null)
    .filter((d): d is string => Boolean(d))
    .sort()[0];
  const paidThisMonth = (releasedRes.data ?? []).reduce(
    (sum, r) => sum + ((r.payout_cents as number) || 0),
    0
  );
  const commissionThisMonth = (releasedRes.data ?? []).reduce(
    (sum, r) => sum + ((r.commission_cents as number) || 0),
    0
  );
  const [{ data: history }, { data: allPays }, { data: activePacks }] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, amount_cents, currency, paid_at, escrow_status, release_after, payout_cents, refunded_cents, commission_cents, clients(first_name, last_name)"
        )
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(30),
      // Encaissements PAR CLIENT (lot 4) : tous les paiements, agrégés.
      supabase
        .from("payments")
        .select(
          "client_id, amount_cents, refunded_cents, released_cents, payout_cents, escrow_status, paid_at, clients(first_name, last_name)"
        )
        .not("paid_at", "is", null)
        .limit(5000),
      supabase
        .from("pack_credits")
        .select("client_id, total, used")
        .eq("status", "active"),
    ]);

  type ClientTotals = {
    id: string;
    name: string;
    count: number;
    collected: number;
    refunded: number;
    paidOut: number;
    escrow: number;
    credits: number;
    lastPaidAt: string;
  };
  const byClient = new Map<string, ClientTotals>();
  for (const p of allPays ?? []) {
    const id = (p.client_id as string | null) ?? "-";
    const cl = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    const cur =
      byClient.get(id) ??
      {
        id,
        name: [cl?.first_name, cl?.last_name].filter(Boolean).join(" ") || "-",
        count: 0,
        collected: 0,
        refunded: 0,
        paidOut: 0,
        escrow: 0,
        credits: 0,
        lastPaidAt: "",
      };
    const amount = (p.amount_cents as number) || 0;
    const refunded = (p.refunded_cents as number) || 0;
    const released = (p.released_cents as number) || 0;
    const status = p.escrow_status as string;
    cur.count += 1;
    cur.collected += amount;
    cur.refunded += refunded;
    // Versé : ce qui est réellement parti vers le coach (progressif ou final).
    cur.paidOut +=
      status === "released" || status === "canceled"
        ? (p.payout_cents as number) || released
        : released;
    if (status === "held" || status === "disputed") {
      cur.escrow += Math.max(0, amount - refunded - released);
    }
    if ((p.paid_at as string) > cur.lastPaidAt) cur.lastPaidAt = p.paid_at as string;
    byClient.set(id, cur);
  }
  for (const pk of activePacks ?? []) {
    const cur = byClient.get(pk.client_id as string);
    if (cur) cur.credits += Math.max(0, (pk.total as number) - (pk.used as number));
  }
  const clientRows = Array.from(byClient.values()).sort(
    (a, b) => b.collected - a.collected
  );
  const grand = clientRows.reduce(
    (acc, r) => ({
      collected: acc.collected + r.collected,
      refunded: acc.refunded + r.refunded,
      paidOut: acc.paidOut + r.paidOut,
      escrow: acc.escrow + r.escrow,
    }),
    { collected: 0, refunded: 0, paidOut: 0, escrow: 0 }
  );

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(loc, {
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
          /* Une fois Stripe branché, « compte connecté » n'apprend plus rien :
             l'état se dit en une pastille, et la carte porte enfin ce que le
             coach vient chercher — ce qui arrive, ce qui est tombé, et l'accès
             à ses virements chez Stripe. */
          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-black">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {pay.connectedTitle}
              </span>
              <StripeDashboardButton />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs font-medium text-text-dim">
                  {pay.heldTotalLabel}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-text-base">
                  {euros(heldTotal)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {nextRelease
                    ? `${pay.releasePlanned} ${new Date(nextRelease).toLocaleDateString(loc, { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`
                    : pay.heldNone}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-bg-elevated p-4">
                <p className="text-xs font-medium text-text-dim">
                  {pay.paidThisMonthLabel}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-accent">
                  {euros(paidThisMonth)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {commissionThisMonth > 0
                    ? `${pay.commissionLabel} ${euros(commissionThisMonth)}`
                    : pay.paidThisMonthNone}
                </p>
              </div>
            </div>
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
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <p className="text-sm text-text-muted">{pay.notConfigured}</p>
          </section>
        )}

        {/* SIRET manquant : le checkout refuse sans lui, mieux vaut le
            réclamer ici que laisser un client du coach buter au paiement. */}
        {coach && !coach.siret && state !== "not_configured" && (
          <SiretForm coachId={coach.id} />
        )}

        {/* Encaissements par client (lot 4) : qui a payé quoi, ce qui est
            déjà versé, ce qui reste sous séquestre, crédits en cours. */}
        {clientRows.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
                {pay.byClientTitle}
              </h2>
              <a
                href="/api/exports/clients"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 text-xs font-medium text-text-base transition-colors hover:border-accent"
              >
                {pay.exportClientsCsv}
              </a>
            </div>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-dim">
                    <th className="px-4 py-2.5">{pay.colClient}</th>
                    <th className="px-3 py-2.5 text-right">{pay.colPayments}</th>
                    <th className="px-3 py-2.5 text-right">{pay.colCollected}</th>
                    <th className="px-3 py-2.5 text-right">{pay.colRefunded}</th>
                    <th className="px-3 py-2.5 text-right">{pay.colPaidOut}</th>
                    <th className="px-3 py-2.5 text-right">{pay.colEscrow}</th>
                    <th className="px-4 py-2.5 text-right">{pay.colCredits}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRows.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5">
                        {r.id !== "-" ? (
                          <Link
                            href={`/dashboard/clients/${r.id}`}
                            className="font-semibold text-text-base hover:text-accent"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{r.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{r.count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-text-base">{euros(r.collected)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{r.refunded > 0 ? euros(r.refunded) : "-"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-accent">{r.paidOut > 0 ? euros(r.paidOut) : "-"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-warning">{r.escrow > 0 ? euros(r.escrow) : "-"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{r.credits > 0 ? r.credits : "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-strong bg-bg-elevated text-sm font-bold">
                    <td className="px-4 py-2.5 text-text-base">{pay.totalRow}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                      {clientRows.reduce((n, r) => n + r.count, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-base">{euros(grand.collected)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{grand.refunded > 0 ? euros(grand.refunded) : "-"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-accent">{euros(grand.paidOut)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-warning">{grand.escrow > 0 ? euros(grand.escrow) : "-"}</td>
                    <td className="px-4 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
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
                  <li key={p.id as string}>
                    {/* Toute la carte ouvre la facture liée à ce paiement. */}
                    <Link
                      href={`/dashboard/factures/${p.id}`}
                      className="block rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/40"
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
                            loc,
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
                        ? `${pay.releasePlanned} ${new Date(p.release_after as string).toLocaleDateString(loc, { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`
                        : p.escrow_status === "released"
                        ? `${pay.netPaid} ${euros((p.payout_cents as number) || 0)}${((p.commission_cents as number) || 0) > 0 ? ` · ${pay.commissionLabel} ${euros((p.commission_cents as number) || 0)}` : ""}`
                        : refundedCents > 0
                        ? `${pay.refundedLabel} ${euros(refundedCents)}${(p.payout_cents as number) > 0 ? ` · ${pay.netPaid} ${euros((p.payout_cents as number) || 0)}` : ""}`
                        : pay.escrowDisputedNote && p.escrow_status === "disputed"
                        ? pay.escrowDisputedNote
                        : ""}
                    </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Note de frais : en tout petit, en pied de page, hors des cartes
            (l'info reste accessible sans plomber le message principal). */}
        {state !== "not_configured" && (
          <p className="mt-8 text-center text-[11px] leading-relaxed text-text-dim/80">
            {feesNote}
          </p>
        )}
        {!isPro(coach?.pro_until) && (
          <ProUpsellCard
            className="mt-4"
            locale={locale}
            title={dict.plans.upsellPaymentsTitle}
            desc={dict.plans.upsellPaymentsDesc}
            cta={dict.plans.upsellCardCta}
            offerBadge={dict.plans.offerBadge}
            perMonth={dict.plans.perMonth}
            offerFrom={dict.plans.offerFrom}
            offerDaysLeft={dict.plans.offerDaysLeft}
            offerLastDay={dict.plans.offerLastDay}
          />
        )}
      </main>
    </>
  );
}
