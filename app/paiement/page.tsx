import type { Metadata } from "next";
import { Suspense } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PaymentEmbed from "@/components/payment/PaymentEmbed";

// Page de paiement EMBARQUÉE : le formulaire Stripe (Embedded Checkout)
// s'affiche ici, sur madger.app, dans notre habillage. Le client ne quitte
// plus le site pour payer. Le client_secret arrive en query (?cs=...), créé
// par /api/stripe/checkout ou /api/stripe/subscription.
export const metadata: Metadata = {
  title: "Paiement sécurisé · Madger",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PaymentPage() {
  const { locale, dict } = getServerDictionary();
  return (
    <I18nProvider locale={locale} dict={dict}>
      <main className="min-h-screen bg-bg">
        <Suspense fallback={null}>
          <PaymentEmbed />
        </Suspense>
      </main>
    </I18nProvider>
  );
}
