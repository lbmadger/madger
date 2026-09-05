import type { MetadataRoute } from "next";

// Manifeste PWA : ajouté à l'écran d'accueil, Madger s'ouvre en plein écran
// (plus de barre Safari qui repousse la navigation du bas), avec son icône
// et son thème sombre. Le point d'entrée est le dashboard : c'est le coach
// qui vit dans l'app au quotidien.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Madger",
    short_name: "Madger",
    description:
      "L'app tout-en-un des coachs sportifs : réservation, paiement et facture dans un seul lien.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
