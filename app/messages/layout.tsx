import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";

export const metadata: Metadata = {
  title: "Madger · Messages",
  robots: { index: false, follow: false },
};

// Espace messagerie côté client (hors dashboard coach). En-tête public (logo +
// langue) de 4rem ; le fil de discussion occupe le reste de la hauteur.
export default function ClientMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = getServerDictionary();
  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        {children}
      </div>
    </I18nProvider>
  );
}
