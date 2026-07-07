import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Défense en profondeur : ces espaces sont déjà derrière une session
      // (et noindex), mais on les écarte aussi explicitement du crawl.
      disallow: [
        "/api/",
        "/dashboard",
        "/admin",
        "/onboarding",
        "/onboarding-client",
        "/espace",
        "/messages",
        "/reservation",
        "/acces",
      ],
    },
    sitemap: "https://madger.app/sitemap.xml",
  };
}
