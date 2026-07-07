import Topbar from "@/components/dashboard/Topbar";
import PricingPlans from "@/components/subscription/PricingPlans";
import ManageSubscription from "@/components/subscription/ManageSubscription";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { isPro, proDaysLeft } from "@/lib/subscription/plan";

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
      ? (avoided90d / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
          style: "currency",
          currency: "EUR",
        })
      : null;
  const untilStr = coach?.pro_until
    ? new Date(coach.pro_until).toLocaleDateString(
        locale === "fr" ? "fr-FR" : "en-US",
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
      </main>
    </>
  );
}
