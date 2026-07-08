import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { createClient as createAnon } from "@supabase/supabase-js";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import PublicHeader from "@/components/marketplace/PublicHeader";
import MarketplaceView from "@/components/marketplace/MarketplaceView";
import type { PublicCoach } from "@/lib/coaches/public-types";

// Liste initiale en cache 120 s : la page reste dynamique (langue via
// cookie) mais chaque visite/crawl ne retape plus Supabase. Client anon
// SANS cookies : obligatoire dans unstable_cache, et suffisant (la vue
// public_coaches est lisible par anon).
const getInitialCoaches = unstable_cache(
  async () => {
    const supabase = createAnon(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from("public_coaches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(24);
    return (data ?? []) as PublicCoach[];
  },
  ["marketplace-initial"],
  { revalidate: 120 }
);

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
  const initialCoaches = await getInitialCoaches();

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <MarketplaceView initialCoaches={initialCoaches} />
      </div>
    </I18nProvider>
  );
}
