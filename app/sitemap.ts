import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const launched = process.env.SITE_LAUNCHED === "1";
  const fixed: MetadataRoute.Sitemap = [
    { url: "https://madger.app", lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...(launched
      ? [
          {
            url: "https://madger.app/coachs",
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.9,
          },
        ]
      : []),
    { url: "https://madger.app/charte-paiement", lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://madger.app/mentions-legales", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/politique-de-confidentialite", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/cgu", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/cgv", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: "https://madger.app/politique-cookies", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Pages coachs (uniquement après lancement ; best-effort : sans service
  // role, on renvoie le fixe).
  if (!launched) return fixed;
  const admin = createAdminClient();
  if (!admin) return fixed;
  const { data: coaches } = await admin
    .from("coaches")
    .select("slug, created_at")
    .eq("listed", true)
    .not("slug", "is", null)
    .limit(1000);

  const coachPages: MetadataRoute.Sitemap = (coaches ?? []).map((c) => ({
    url: `https://madger.app/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...fixed, ...coachPages];
}
