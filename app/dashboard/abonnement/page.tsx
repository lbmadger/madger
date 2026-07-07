import Topbar from "@/components/dashboard/Topbar";
import PricingPlans from "@/components/subscription/PricingPlans";
import PromoCode from "@/components/subscription/PromoCode";
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
  if (!pro) {
    const supabase = createClient();
    const { data } = await supabase
      .from("payments")
      .select("commission_cents, released_at, resolved_at, paid_at")
      .gt("commission_cents", 0)
      // paid_at précède toujours le versement : 210 jours couvrent largement
      // la fenêtre de 90 jours, sans rapatrier tout l'historique.
      .gte("paid_at", new Date(Date.now() - 210 * 86400000).toISOString())
      .limit(2000);
    const since = Date.now() - 90 * 86400000;
    commission90d = (data ?? []).reduce((s, r) => {
      const at =
        (r.released_at as string | null) ??
        (r.resolved_at as string | null) ??
        (r.paid_at as string | null);
      if (!at || new Date(at).getTime() < since) return s;
      return s + ((r.commission_cents as number) || 0);
    }, 0);
  }
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
        {/* Statut */}
        <div
          className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border p-5 ${
            pro
              ? "border-accent/30 bg-accent/[0.05]"
              : "border-border bg-bg-card"
          }`}
        >
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
          <div className="flex flex-col items-end gap-2">
            {pro && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
                {p.proActive}
              </span>
            )}
            {coach?.stripe_customer_id && <ManageSubscription />}
          </div>
        </div>

        {/* Code promo */}
        <div className="mb-6">
          <PromoCode />
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
