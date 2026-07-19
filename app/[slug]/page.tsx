import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient as createAnon } from "@supabase/supabase-js";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import PublicHeader from "@/components/marketplace/PublicHeader";
import CoachProfile from "@/components/marketplace/CoachProfile";
import {
  type PublicCoach,
  type PublicReview,
  coachFullName,
} from "@/lib/coaches/public-types";
import type { PublicService } from "@/lib/services/types";

// Profil public d'un coach : madger.app/<slug>. Route dynamique de premier
// niveau — les routes statiques (/, /coachs, /cgu, /dashboard…) gardent la
// priorité ; seules les URL non reconnues atterrissent ici, et renvoient un
// 404 propre si le slug ne correspond à aucun coach visible.

// Profil + prestations + avis en cache 120 s par slug : la page reste
// dynamique (langue via cookie) mais le crawl Google des 1000 pages coach
// ne retape plus Supabase à chaque hit. Client anon SANS cookies
// (obligatoire dans unstable_cache ; les vues publiques suffisent).
const getCoachPageData = unstable_cache(
  async (slug: string) => {
    const supabase = createAnon(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: coach, error } = await supabase
      .from("public_coaches")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    // Une erreur de la VUE (migration en cours, vue recréée) n'est pas un
    // slug inconnu : on la trace pour la voir dans les logs Vercel au lieu
    // d'un 404 muet.
    if (error) {
      console.error("[slug] public_coaches query failed:", error.message);
    }
    if (!coach) return { coach: null, services: [], reviews: [] };
    const [{ data: services }, { data: reviews }] = await Promise.all([
      supabase.from("public_services").select("*").eq("coach_id", coach.id),
      supabase
        .from("public_reviews")
        .select("*")
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return {
      coach: coach as PublicCoach,
      services: (services ?? []) as PublicService[],
      reviews: (reviews ?? []) as PublicReview[],
    };
  },
  ["coach-page"],
  { revalidate: 120 }
);

async function getCoachBySlug(slug: string): Promise<PublicCoach | null> {
  const { coach } = await getCoachPageData(slug);
  return coach;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const coach = await getCoachBySlug(params.slug);
  if (!coach) return { title: "Madger" };
  const name = coachFullName(coach);
  const title = `${name}, coach sportif${coach.city ? ` à ${coach.city}` : ""} · Madger`;
  const description = coach.specialty
    ? `${name}, ${coach.specialty}${coach.city ? ` à ${coach.city}` : ""}. Réserve ta séance en ligne, paiement sécurisé, annulation flexible.`
    : `Réserve une séance avec ${name} sur Madger. Paiement sécurisé, annulation flexible.`;
  return {
    title,
    description,
    alternates: { canonical: `https://madger.app/${coach.slug}` },
    openGraph: {
      title,
      description,
      url: `https://madger.app/${coach.slug}`,
      type: "profile",
      siteName: "Madger",
      ...(coach.avatar_url ? { images: [{ url: coach.avatar_url }] } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

// Le visiteur est-il le COACH propriétaire de ce slug, avec un profil pas
// encore publié ? Renvoie l'état des critères de publication, ou null (le
// visiteur n'est pas ce coach → vrai 404).
async function getOwnPublishState(slug: string): Promise<{
  firstName: string | null;
  checks: { done: boolean; label: string; href: string }[];
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS : un coach ne lit que sa propre ligne.
  const { data: me } = await supabase
    .from("coaches")
    .select("id, first_name, avatar_url, bio, listed, stripe_charges_enabled")
    .eq("id", user.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!me) return null;

  const [{ count: services }, { count: avails }] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .eq("active", true),
    supabase
      .from("availabilities")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id),
  ]);

  const checks = [
    {
      done: Boolean(me.avatar_url && (me.bio ?? "").trim()),
      label: "Ajouter ta photo et ta présentation",
      href: "/dashboard/reglages",
    },
    {
      done: Boolean(me.stripe_charges_enabled),
      label: "Activer les paiements (Stripe)",
      href: "/dashboard/paiements",
    },
    {
      done: (services ?? 0) > 0,
      label: "Créer au moins une prestation",
      href: "/dashboard/prestations",
    },
    {
      done: (avails ?? 0) > 0,
      label: "Définir au moins une disponibilité",
      href: "/dashboard/disponibilites",
    },
    {
      done: Boolean(me.listed),
      label: "Rendre ton profil visible dans l'annuaire",
      href: "/dashboard/reglages",
    },
  ];
  return { firstName: (me.first_name as string | null) ?? null, checks };
}

export default async function CoachPublicPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string; conflict?: string; sub?: string };
}) {
  const { locale, dict } = getServerDictionary();
  const { coach, services, reviews } = await getCoachPageData(params.slug);

  if (!coach) {
    // Page publique absente : si c'est le COACH lui-même qui ouvre son propre
    // profil non encore publié, on lui explique ce qui manque au lieu d'un
    // 404 muet. Sinon, vrai 404.
    const owner = await getOwnPublishState(params.slug);
    if (owner) {
      const { default: CoachNotPublished } = await import(
        "@/components/marketplace/CoachNotPublished"
      );
      return (
        <div className="min-h-screen bg-bg">
          <CoachNotPublished firstName={owner.firstName} checks={owner.checks} />
        </div>
      );
    }
    notFound();
  }

  // Données structurées (Google). Person n'est pas éligible aux extraits
  // d'avis : la note passe par un Service avec offres (prestations réelles),
  // le coach reste décrit en Person via provider.
  const person = {
    "@type": "Person",
    name: coachFullName(coach),
    jobTitle: coach.specialty || "Coach sportif",
    url: `https://madger.app/${coach.slug}`,
    ...(coach.avatar_url ? { image: coach.avatar_url } : {}),
    ...(coach.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: coach.city,
            addressCountry: "FR",
          },
        }
      : {}),
  };
  // Zone desservie : un Place géolocalisé quand on a les coordonnées (signal
  // local plus fort qu'un simple nom de ville).
  const areaServed =
    coach.lat != null && coach.lng != null
      ? {
          "@type": "Place",
          ...(coach.city ? { name: coach.city } : {}),
          geo: {
            "@type": "GeoCoordinates",
            latitude: coach.lat,
            longitude: coach.lng,
          },
        }
      : coach.city || undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: coach.specialty || "Coaching sportif",
    name: `Coaching avec ${coachFullName(coach)}`,
    url: `https://madger.app/${coach.slug}`,
    provider: person,
    ...(areaServed ? { areaServed } : {}),
    ...(services.length > 0
      ? {
          offers: services
            .filter((s) => (s.price_cents as number) > 0)
            .slice(0, 10)
            .map((s) => ({
              "@type": "Offer",
              name: s.name,
              price: ((s.price_cents as number) / 100).toFixed(2),
              priceCurrency: (
                (s.currency as string) || "eur"
              ).toUpperCase(),
              url: `https://madger.app/${coach.slug}`,
            })),
        }
      : {}),
    ...(coach.rating_avg != null && coach.rating_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(coach.rating_avg),
            reviewCount: coach.rating_count,
            bestRating: 5,
          },
        }
      : {}),
  };

  // Fil d'Ariane (breadcrumb affiché sous le titre dans Google) :
  // Accueil › Trouve ton coach › {Coach}.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Madger", item: "https://madger.app" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Trouve ton coach",
        item: "https://madger.app/coachs",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: coachFullName(coach),
        item: `https://madger.app/${coach.slug}`,
      },
    ],
  };

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PublicHeader />
        {/* Retour de paiement sans réservation retrouvée : on rassure. */}
        {searchParams.paid === "1" && (
          <p className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-center text-sm text-text-base">
            {dict.booking.paidBanner}
          </p>
        )}
        {searchParams.conflict === "1" && (
          <p className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-center text-sm text-text-base">
            {dict.booking.conflictBanner}
          </p>
        )}
        {searchParams.sub === "1" && (
          <p className="mx-auto mt-4 w-full max-w-2xl rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-center text-sm text-text-base">
            {dict.booking.subBanner}
          </p>
        )}
        <CoachProfile
          coach={coach}
          services={services}
          reviews={reviews}
        />
      </div>
    </I18nProvider>
  );
}
