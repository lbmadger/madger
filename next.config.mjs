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
    return [
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
