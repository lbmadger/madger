import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import PricingPlans from "@/components/subscription/PricingPlans";
import ManageSubscription from "@/components/subscription/ManageSubscription";
import ReferralCard from "@/components/subscription/ReferralCard";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { isPro, proDaysLeft } from "@/lib/subscription/plan";
import { madgerInvoiceNumber, commissionPeriod } from "@/lib/invoices/utils";
import { DownloadIcon, FileTextIcon } from "@/components/ui/icons";

// Page Abonnement : statut du coach + offres Free/Pro + code promo.
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { pro?: string };
}) {
  const { dict, locale } = getServerDictionary();
  const p = dict.plans;
  const { coach } = await getCoach();

  const pro = isPro(coach?.pro_until);
  const daysLeft = proDaysLeft(coach?.pro_until);

  // Commission réellement prélevée sur 90 jours : l'argument chiffré de la
  // carte Pro. Datée du versement (released_at, ou résolution de litige),
  // pas de l'encaissement : c'est au versement que la commission naît.
  let commission90d = 0;
  // Pour un coach PRO : commission qu'il AURAIT payée en Gratuit (5 % des
  // montants versés sur 90 jours). Argument central de l'écran de rétention.
  let avoided90d = 0;
  {
    const supabase = createClient();
    const { data } = await supabase
      .from("payments")
      .select("amount_cents, commission_cents, released_at, resolved_at, paid_at")
      // paid_at précède toujours le versement : 210 jours couvrent largement
      // la fenêtre de 90 jours, sans rapatrier tout l'historique.
      .gte("paid_at", new Date(Date.now() - 210 * 86400000).toISOString())
      .in("escrow_status", ["released", "canceled"])
      .limit(2000);
    const since = Date.now() - 90 * 86400000;
    for (const r of data ?? []) {
      const at =
        (r.released_at as string | null) ??
        (r.resolved_at as string | null) ??
        (r.paid_at as string | null);
      if (!at || new Date(at).getTime() < since) continue;
      commission90d += (r.commission_cents as number) || 0;
      avoided90d += Math.round(((r.amount_cents as number) || 0) * 0.05);
    }
  }
  const savedStr =
    pro && avoided90d > 0
      ? (avoided90d / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
          style: "currency",
          currency: "EUR",
        })
      : null;
  // Parrainage : lien du coach + compteurs (filleuls inscrits, récompenses).
  let referred = 0;
  let rewarded = 0;
  if (coach?.id) {
    const supabase = createClient();
    const [{ count: refCount }, { count: rewCount }] = await Promise.all([
      supabase
        .from("coaches")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", coach.id),
      supabase
        .from("coaches")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", coach.id)
        .not("referral_rewarded_at", "is", null),
    ]);
    referred = refCount ?? 0;
    rewarded = rewCount ?? 0;
  }
  // Factures Madger : une par mois de commission prélevée. Elles vivent ici
  // (c'est Madger qui facture le coach) et plus avec les factures que le
  // coach émet à ses clients.
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const byPeriod = new Map<string, { total: number; count: number }>();
  {
    const supabase = createClient();
    const { data: commissions } = await supabase
      .from("payments")
      .select("commission_cents, released_at, resolved_at, paid_at")
      .gt("commission_cents", 0)
      // Borné à 36 mois et 2000 lignes : au-delà, Supabase tronquerait en
      // silence (max-rows) et les totaux seraient faux.
      .gte("paid_at", new Date(Date.now() - 36 * 31 * 86400000).toISOString())
      .order("paid_at", { ascending: false })
      .limit(2000);
    for (const c of commissions ?? []) {
      const period = commissionPeriod(c as never);
      if (!period) continue;
      const cur = byPeriod.get(period) ?? { total: 0, count: 0 };
      cur.total += (c.commission_cents as number) || 0;
      cur.count += 1;
      byPeriod.set(period, cur);
    }
  }
  const madgerRows = Array.from(byPeriod.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([period, v]) => ({
      period,
      number: coach ? madgerInvoiceNumber(coach.id, period) : period,
      label: new Date(`${period}-01T12:00:00Z`).toLocaleDateString(loc, {
        month: "long",
        year: "numeric",
      }),
      total: (v.total / 100).toLocaleString(loc, {
        style: "currency",
        currency: "EUR",
      }),
      count: v.count,
    }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";
  const referralLink = coach?.referral_code
    ? `${appUrl}/signup?ref=${coach.referral_code}`
    : null;

  const untilStr = coach?.pro_until
    ? new Date(coach.pro_until).toLocaleDateString(
        locale === "fr" ? "fr-FR" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      )
    : null;

  return (
    <>
      <Topbar title={p.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Retour de Stripe après souscription : on célèbre. */}
        {searchParams.pro === "1" && pro && (
          <p className="mb-4 rounded-2xl border border-accent/30 bg-accent/[0.08] px-4 py-3 text-center text-sm font-semibold text-text-base">
            {p.welcomePro}
          </p>
        )}
        {/* Statut : plan bien lisible en haut, action rangée en dessous
            (le bouton coincé à droite écrasait la carte sur mobile). */}
        <div
          className={`mb-6 rounded-2xl border p-5 ${
            pro
              ? "border-accent/30 bg-accent/[0.05]"
              : "border-border bg-bg-card"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
                {p.currentPlan}
              </p>
              <p className="mt-1 text-xl font-extrabold text-text-base">
                {pro ? p.pro : p.free}
              </p>
              {pro && untilStr && (
                <p className="mt-0.5 text-sm text-text-muted">
                  {p.proUntil} {untilStr} · {daysLeft} {p.daysLeft}
                </p>
              )}
            </div>
            {pro && (
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
                {p.proActive}
              </span>
            )}
          </div>
          {coach?.stripe_customer_id && (
            <div className="mt-4 border-t border-border pt-4">
              <ManageSubscription
                savedStr={savedStr}
                plan={coach?.subscription_plan ?? null}
              />
            </div>
          )}
        </div>

        {/* Offres */}
        <PricingPlans
          currentPlan={pro ? "pro" : "free"}
          commission90dCents={commission90d}
        />

        {/* Parrainage : 1 mois de Pro offert pour chaque coach parrainé qui
            passe Pro. */}
        {referralLink && (
          <ReferralCard
            link={referralLink}
            referred={referred}
            rewarded={rewarded}
          />
        )}

        {/* Factures Madger (commission de service, une par mois) : c'est
            Madger qui facture le coach, leur place est ici, pas au milieu
            des factures qu'il émet à ses clients. */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {inv.madgerSection}
          </h2>
          <p className="mt-1 text-xs text-text-dim">{inv.madgerSubtitle}</p>
          {madgerRows.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-border bg-bg-card p-6 text-center">
              <p className="text-sm text-text-muted">{inv.madgerEmpty}</p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {madgerRows.map((r) => (
                <li
                  key={r.period}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <FileTextIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-text-base">
                      {r.label}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {r.number} · {r.count} {inv.sessionsCount}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-text-base">
                    {r.total}
                  </span>
                  <Link
                    href={`/dashboard/factures/madger/${r.period}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base transition-colors hover:border-accent"
                  >
                    <DownloadIcon size={12} />
                    {inv.download}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
