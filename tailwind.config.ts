import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        "bg-elevated": "#111111",
        "bg-card": "#141414",
        accent: "#CBFF03",
        "accent-glow": "rgba(203,255,3,0.15)",
        "text-base": "#FFFFFF",
        "text-muted": "#9A9A9A",
        // Éclairci (#757575 → #8C8C8C) : sur les cartes #141414, #757575 ne
        // faisait qu'environ 4,0:1 en petit corps. #8C8C8C atteint environ
        // 5,5:1, confortablement au-dessus du seuil AA (4,5:1).
        "text-dim": "#8C8C8C",
        border: "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.12)",
        // Couleurs d'état : une seule source pour succès / attention / erreur.
        success: "#CBFF03",
        warning: "#FACC15",
        danger: "#F87171",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(203,255,3,0.08), transparent 70%)",
      },
    },
  },
  plugins: [],
};

export default config;