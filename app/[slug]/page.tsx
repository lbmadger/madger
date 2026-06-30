import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import CoachProfile from "@/components/marketplace/CoachProfile";
import {
  type PublicCoach,
  coachFullName,
} from "@/lib/coaches/public-types";

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
  return {
    title: `${name} · Madger`,
    description: coach.specialty
      ? `${name} — ${coach.specialty}${coach.city ? ` à ${coach.city}` : ""}. Réserve ta séance sur Madger.`
      : `Réserve une séance avec ${name} sur Madger.`,
  };
}

export default async function CoachPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const { locale, dict } = getServerDictionary();
  const coach = await getCoachBySlug(params.slug);

  if (!coach) {
    notFound();
  }

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <CoachProfile coach={coach} />
      </div>
    </I18nProvider>
  );
}
