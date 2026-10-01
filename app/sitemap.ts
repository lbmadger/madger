import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_POSTS } from "@/lib/blog/posts";
import { siteLaunched } from "@/lib/launch";
import { DIRECTORY_MIN_COACHES } from "@/lib/directory";

// Regénéré au plus une fois par heure : les crawlers ne déclenchent pas une
// requête base à chaque passage.
export const revalidate = 3600;

// Sitemap dynamique : pages fixes + pages publiques des coachs (SEO local
// « coach sportif <ville> »). Les slugs viennent de la base à la demande.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Avant le lancement (SITE_LAUNCHED non posé), le verrou d'accès bloque la
  // marketplace : ne lister que les pages réellement servies aux crawlers,
  // sinon Search Console se remplit d'URL en redirection.
  const launched = siteLaunched();
  // Pages coachs réellement servies : la vue public_coaches (profil complet,
  // Stripe activé, prestation et disponibilités), exactement ce que /[slug]
  // lit. Lire « coaches.listed » annonçait à Google des pages en 404.
  const admin = launched ? createAdminClient() : null;
  const { data: coaches, count: coachCount } = admin
    ? await admin.from("public_coaches").select("slug", { count: "exact" }).limit(1000)
    : { data: null, count: null };
  const directoryOpen = (coachCount ?? 0) >= DIRECTORY_MIN_COACHES;
  // Pages légales : date de dernière révision réelle (pas de fraîcheur
  // factice qui changerait à chaque régénération).
  const legalDate = new Date("2026-10-01");
  const fixed: MetadataRoute.Sitemap = [
    { url: "https://madger.app", lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: "https://madger.app/fonctionnalites", lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://madger.app/application-coach-sportif", lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // Page vitrine (exemple de page coach) : publique avant même le lancement.
    { url: "https://madger.app/exemple", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: "https://madger.app/exemple/dashboard", lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: "https://madger.app/contact", lastModified: legalDate, changeFrequency: "yearly", priority: 0.3 },
    // Blog : index + articles, publics et crawlables avant le lancement.
    { url: "https://madger.app/blog", lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...ALL_POSTS.map((p) => ({
      url: `https://madger.app/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // /coachs seulement quand l'annuaire est réellement ouvert (sinon la
    // page est en noindex : deux signaux contradictoires pour Google).
    ...(launched && directoryOpen
      ? [
          {
            url: "https://madger.app/coachs",
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.9,
          },
        ]
      : []),
    { url: "https://madger.app/charte-paiement", lastModified: legalDate, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://madger.app/mentions-legales", lastModified: legalDate, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/politique-de-confidentialite", lastModified: legalDate, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/cgu", lastModified: legalDate, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/cgv", lastModified: legalDate, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/politique-cookies", lastModified: legalDate, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Pages coachs (uniquement après lancement ; best-effort : sans service
  // role, on renvoie le fixe).
  if (!launched || !coaches) return fixed;

  const coachPages: MetadataRoute.Sitemap = (coaches ?? []).map((c) => ({
    url: `https://madger.app/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...fixed, ...coachPages];
}
