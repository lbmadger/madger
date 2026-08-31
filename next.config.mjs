/** @type {import("next").NextConfig} */
const nextConfig = {
  // Les polices des cartes story (/api/story) sont lues sur disque au
  // runtime : on force leur inclusion dans le bundle serverless Vercel.
  experimental: {
    outputFileTracingIncludes: {
      "/api/story": ["./assets/fonts/*.ttf"],
    },
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
