import Topbar from "@/components/dashboard/Topbar";
import PricingPlans from "@/components/subscription/PricingPlans";
import PromoCode from "@/components/subscription/PromoCode";
import ManageSubscription from "@/components/subscription/ManageSubscription";
import { getCoach } from "@/lib/coach/getCoach";
import { getServerDictionary } from "@/lib/i18n/server";
import { isPro, proDaysLeft } from "@/lib/subscription/plan";

// Page Abonnement : statut du coach + offres Free/Pro + code promo.
export default async function SubscriptionPage() {
  const { dict, locale } = getServerDictionary();
  const p = dict.plans;
  const { coach } = await getCoach();

  const pro = isPro(coach?.pro_until);
  const daysLeft = proDaysLeft(coach?.pro_until);
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
        <PricingPlans currentPlan={pro ? "pro" : "free"} />
      </main>
    </>
  );
}
