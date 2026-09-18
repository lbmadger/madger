import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SessionProvider } from "@/lib/auth/SessionProvider";
import ProUpsellModal from "@/components/subscription/ProUpsellModal";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/coach/getCoach";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/subscription/plan";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import ContentPad from "@/components/dashboard/ContentPad";

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

  // Vie de client sur le même compte ? Profil sportif rempli, ou une fiche
  // client à son email chez un coach (réservation faite avec ce compte).
  // Sans ça, un coach qui ne réserve jamais ne voit pas de bascule client.
  const clientSpace = await hasClientSpace(user.id, user.email ?? null);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <SessionProvider
        user={{
          clientSpace,
          email: user.email ?? "",
          slug: coach?.slug ?? null,
          pro: isPro(coach?.pro_until),
          trialEligible:
            !coach?.stripe_subscription_id &&
            !coach?.pro_trial_used_at &&
            coach?.subscription_status !== "canceled",
          name:
            [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
            null,
          avatarUrl: coach?.avatar_url ?? null,
          googleConnected: !!coach?.google_connected_at,
        }}
      >
        <div className="flex min-h-screen bg-bg text-text-base">
          <Sidebar />
          <ContentPad>{children}</ContentPad>
          <MobileNav />
          {/* Fenêtre Pro pour les coachs en Gratuit (fermable, revient au
              plus tôt 7 jours plus tard). */}
          <ProUpsellModal />
        </div>
      </SessionProvider>
    </I18nProvider>
  );
}

async function hasClientSpace(userId: string, email: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const [{ data: profile }, { data: clientRow }] = await Promise.all([
      admin.from("client_profiles").select("id").eq("id", userId).maybeSingle(),
      email
        ? admin.from("clients").select("id").ilike("email", email.trim().toLowerCase()).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return !!profile || !!clientRow;
  } catch {
    return false;
  }
}
