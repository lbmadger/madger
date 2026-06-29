import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

// Layout propre au dashboard. Il hérite du <html><body> racine (donc du dark
// mode global) mais pose sa propre structure sidebar + contenu, sans aucun
// impact sur la landing. La langue est résolue ici, côté serveur, et fournie
// à tout l'arbre via le provider i18n.

export const metadata: Metadata = {
  title: "Madger · Dashboard",
  // Espace privé : pas d'indexation moteur.
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = getServerDictionary();

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-screen bg-bg text-text-base">
        <Sidebar />
        {/* pb-20 réserve la hauteur de la barre d'onglets mobile (md:pb-0) */}
        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          {children}
        </div>
        <MobileNav />
      </div>
    </I18nProvider>
  );
}
