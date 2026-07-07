import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
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

async function getCoachBySlug(slug: string): Promise<PublicCoach | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_coaches")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as PublicCoach | null) ?? null;
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

export default async function CoachPublicPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string; conflict?: string; sub?: string };
}) {
  const { locale, dict } = getServerDictionary();
  const coach = await getCoachBySlug(params.slug);

  if (!coach) {
    notFound();
  }

  // Prestations actives + derniers avis du coach (vues publiques).
  const supabase = createClient();
  const [{ data: services }, { data: reviews }] = await Promise.all([
    supabase.from("public_services").select("*").eq("coach_id", coach.id),
    supabase
      .from("public_reviews")
      .select("*")
      .eq("coach_id", coach.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Données structurées (Google) : personne + note agrégée si avis.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: coachFullName(coach),
    jobTitle: coach.specialty || "Coach sportif",
    url: `https://madger.app/${coach.slug}`,
    ...(coach.avatar_url ? { image: coach.avatar_url } : {}),
    ...(coach.city
      ? { address: { "@type": "PostalAddress", addressLocality: coach.city } }
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

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          services={(services ?? []) as PublicService[]}
          reviews={(reviews ?? []) as PublicReview[]}
        />
      </div>
    </I18nProvider>
  );
}
