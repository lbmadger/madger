import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";

// Onboarding hors du layout dashboard (pas de sidebar) : un écran centré et
// focalisé. Protégé par le middleware (matcher /onboarding).

export const metadata: Metadata = {
  title: "Madger · Bienvenue",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = getServerDictionary();

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </I18nProvider>
  );
}
