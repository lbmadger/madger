import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import MarketplaceView from "@/components/marketplace/MarketplaceView";
import type { PublicCoach } from "@/lib/coaches/public-types";

export const metadata: Metadata = {
  alternates: { canonical: "/coachs" },
  title: "Madger · Trouve ton coach",
  description:
    "Trouve un coach sportif près de chez toi ou en ligne, et réserve ta séance.",
};

// Marketplace publique : accessible sans connexion. Liste initiale des coachs
// visibles (vue public_coaches, lecture autorisée au rôle anon).
export default async function MarketplacePage() {
  const { locale, dict } = getServerDictionary();
  const supabase = createClient();

  const { data } = await supabase
    .from("public_coaches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <MarketplaceView initialCoaches={(data ?? []) as PublicCoach[]} />
      </div>
    </I18nProvider>
  );
}
