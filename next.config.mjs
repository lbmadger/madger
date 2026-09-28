/** @type {import("next").NextConfig} */
const nextConfig = {
  // Les polices des cartes story (/api/story) sont lues sur disque au
  // runtime : on force leur inclusion dans le bundle serverless Vercel.
  experimental: {
    outputFileTracingIncludes: {
      "/api/story": ["./assets/fonts/*.ttf"],
    },
  },
  // Images statiques de public/ : Lighthouse signalait des durées de cache
  // courtes. Trente jours avec revalidation en arrière-plan : un logo changé
  // est repris sous un jour, sans immutabiliser un an.
  async headers() {
    const cache = [
      { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
    ];
    // En-têtes de sécurité sur toutes les pages : pas d'encadrement par un
    // site tiers (clickjacking sur le paiement ou le dashboard), pas de
    // devinette de type MIME, referer réduit hors du site. Les iframes
    // Stripe vivent DANS nos pages : elles ne sont pas concernées.
    const security = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      { source: "/(.*)", headers: security },
      { source: "/logo.png", headers: cache },
      { source: "/character/:path*", headers: cache },
      { source: "/landing/:path*", headers: cache },
      { source: "/exemple/:path*", headers: cache },
      { source: "/instagram-posts/:path*", headers: cache },
    ];
  },
  images: {
    // Photos de profil servies depuis le Storage Supabase.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Photo de la page vitrine /exemple (contenu de démonstration).
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
