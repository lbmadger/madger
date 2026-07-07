import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import ServicesView from "@/components/dashboard/services/ServicesView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import type { Service } from "@/lib/services/types";

// Page Prestations : les offres du coach (séance, pack, abonnement).
// Deux prérequis pour créer des prestations : un compte Stripe actif (sinon
// les offres seraient affichées sans pouvoir être réglées) et un SIRET
// (sinon les factures émises au premier encaissement ne sont pas conformes).
export default async function ServicesPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();
  const { coach } = await getCoach();
  const stripeReady = Boolean(coach?.stripe_charges_enabled);
  const siretReady = Boolean(coach?.siret?.trim());

  const { data } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <>
      <Topbar title={dict.services.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!stripeReady && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">
                {dict.services.needStripeTitle}
              </p>
              <p className="text-xs text-text-muted">
                {dict.services.needStripeDesc}
              </p>
            </div>
            <Link
              href="/dashboard/paiements"
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              {dict.services.needStripeCta}
            </Link>
          </div>
        )}
        {stripeReady && !siretReady && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">
                {dict.services.needSiretTitle}
              </p>
              <p className="text-xs text-text-muted">
                {dict.services.needSiretDesc}
              </p>
            </div>
            <Link
              href="/dashboard/reglages"
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              {dict.services.needSiretCta}
            </Link>
          </div>
        )}
        <ServicesView
          initialServices={(data ?? []) as Service[]}
          canCreate={stripeReady && siretReady}
        />
      </main>
    </>
  );
}
