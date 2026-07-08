"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import MadgerLogo from "@/components/ui/MadgerLogo";

// Monte le formulaire Stripe Embedded Checkout dans la page /paiement.
// Le client_secret (query ?cs=) n'autorise que CE paiement : il peut passer
// dans l'URL sans risque. `back` ramène au point de départ (page du coach
// avec la modale rouverte, ou page Abonnement) : chemins internes uniquement.
export default function PaymentEmbed() {
  const { t } = useI18n();
  const params = useSearchParams();
  const cs = params.get("cs");
  const rawBack = params.get("back") || "/";
  const back =
    rawBack.startsWith("/") && !rawBack.startsWith("//") ? rawBack : "/";
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cs || !mountRef.current) return;
    let destroyed = false;
    let instance: { destroy: () => void } | null = null;
    (async () => {
      try {
        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        if (!stripe) throw new Error("stripe_load_failed");
        const checkout = await stripe.createEmbeddedCheckoutPage({
          clientSecret: cs,
        });
        if (destroyed) {
          checkout.destroy();
          return;
        }
        instance = checkout;
        checkout.mount(mountRef.current!);
      } catch {
        if (!destroyed) setError(true);
      }
    })();
    return () => {
      destroyed = true;
      instance?.destroy();
    };
  }, [cs]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <Link href={back} aria-label={t("payment.back")}>
          <MadgerLogo />
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t("payment.secure")}
        </span>
      </div>

      {!cs || error ? (
        <div className="rounded-2xl border border-border bg-bg-card p-8 text-center">
          <p className="text-sm text-text-muted">{t("payment.error")}</p>
          <Link
            href={back}
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t("payment.back")}
          </Link>
        </div>
      ) : (
        <>
          {/* Le formulaire Stripe est clair : un cadre blanc arrondi évite
              l'effet « collé » sur notre fond sombre. */}
          <div
            ref={mountRef}
            className="overflow-hidden rounded-2xl bg-white"
          />
          <p className="mt-4 text-center">
            <Link
              href={back}
              className="text-xs text-text-dim underline transition-colors hover:text-text-muted"
            >
              {t("payment.back")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
