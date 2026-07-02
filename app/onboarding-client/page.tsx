import { Suspense } from "react";
import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import ClientOnboarding from "@/components/client/ClientOnboarding";

export const metadata: Metadata = {
  title: "Madger · Mon profil sportif",
  robots: { index: false, follow: false },
};

// Onboarding client (3 étapes) — protégé par le middleware (session requise).
export default function ClientOnboardingPage() {
  const { locale, dict } = getServerDictionary();
  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <Suspense>
          <ClientOnboarding />
        </Suspense>
      </div>
    </I18nProvider>
  );
}
