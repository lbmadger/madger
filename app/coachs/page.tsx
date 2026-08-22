import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient as createAnon } from "@supabase/supabase-js";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import PublicHeader from "@/components/marketplace/PublicHeader";
import MarketplaceView from "@/components/marketplace/MarketplaceView";
import Leo from "@/components/ui/Leo";
import type { PublicCoach } from "@/lib/coaches/public-types";

// Démarrage à froid : en dessous de ce nombre de coachs publiés, l'annuaire
// affiche « ouvre bientôt » au lieu d'une grille quasi vide qui crierait
// « personne n'utilise ce produit ». L'ouverture est automatique : dès que le
// seuil est atteint, la grille remplace le teaser sans aucun déploiement.
const DIRECTORY_MIN_COACHES = 10;

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

// Tant que l'annuaire n'est pas ouvert, on demande aux moteurs de ne pas
// indexer la page teaser (le référencement démarrera sur la vraie liste).
export async function generateMetadata(): Promise<Metadata> {
  const coaches = await getInitialCoaches();
  const open = coaches.length >= DIRECTORY_MIN_COACHES;
  return {
    alternates: { canonical: "/coachs" },
    title: "Madger · Trouve ton coach",
    description:
      "Trouve un coach sportif près de chez toi ou en ligne, et réserve ta séance.",
    ...(open ? {} : { robots: { index: false, follow: true } }),
  };
}

// Teaser d'avant-ouverture : pas de grille vide, un message honnête et les
// deux sorties utiles (le client retrouve son espace, le coach s'inscrit).
function DirectorySoon({
  m,
}: {
  m: {
    soonBadge: string;
    soonTitle: string;
    soonDesc: string;
    soonClientCta: string;
    soonCoachHint: string;
    soonCoachCta: string;
  };
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <Leo pose="point" size={110} />
      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-4 py-1.5 text-xs font-semibold tracking-wide text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        {m.soonBadge}
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-text-base">
        {m.soonTitle}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{m.soonDesc}</p>
      <Link
        href="/espace"
        className="mt-7 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        {m.soonClientCta}
      </Link>
      <p className="mt-8 text-sm text-text-dim">
        {m.soonCoachHint}{" "}
        <Link
          href="/signup"
          className="font-semibold text-text-base underline underline-offset-4 transition-colors hover:text-accent"
        >
          {m.soonCoachCta}
        </Link>
      </p>
    </main>
  );
}

// Marketplace publique : accessible sans connexion. Liste initiale des coachs
// visibles (vue public_coaches, lecture autorisée au rôle anon).
export default async function MarketplacePage() {
  const { locale, dict } = getServerDictionary();
  const initialCoaches = await getInitialCoaches();
  const open = initialCoaches.length >= DIRECTORY_MIN_COACHES;

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        {open ? (
          <MarketplaceView initialCoaches={initialCoaches} />
        ) : (
          <DirectorySoon m={dict.marketplace} />
        )}
      </div>
    </I18nProvider>
  );
}
