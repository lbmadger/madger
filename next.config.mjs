/** @type {import("next").NextConfig} */
const nextConfig = {
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
