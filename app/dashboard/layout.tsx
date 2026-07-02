import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SessionProvider } from "@/lib/auth/SessionProvider";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/coach/getCoach";
import { isPro } from "@/lib/subscription/plan";
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = getServerDictionary();

  // Garde serveur : le middleware protège déjà /dashboard, mais on revérifie
  // ici pour récupérer l'utilisateur et l'injecter dans le contexte. Si la
  // session a expiré entre-temps, on renvoie au login.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Un compte sans profil coach (= client) n'a rien à faire dans l'espace
  // coach → on le renvoie vers la marketplace. (Si la table n'existe pas encore
  // — SQL non lancé — on laisse passer pour ne pas bloquer le dev.)
  const { coach, missingTable } = await getCoach();
  if (!missingTable && !coach) {
    redirect("/coachs");
  }
  // Tant que le profil n'est pas complété, on force l'onboarding.
  if (!missingTable && coach && !coach.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <I18nProvider locale={locale} dict={dict}>
      <SessionProvider
        user={{
          email: user.email ?? "",
          slug: coach?.slug ?? null,
          pro: isPro(coach?.pro_until),
          name:
            [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
            null,
          avatarUrl: coach?.avatar_url ?? null,
        }}
      >
        <div className="flex min-h-screen bg-bg text-text-base">
          <Sidebar />
          {/* pb-20 réserve la hauteur de la barre d'onglets mobile (md:pb-0) */}
          <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
            {children}
          </div>
          <MobileNav />
        </div>
      </SessionProvider>
    </I18nProvider>
  );
}
