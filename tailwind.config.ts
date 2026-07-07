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
        // Éclairci (#5A5A5A → #757575) pour rester lisible en petit corps sur
        // fond #0A0A0A/#141414 (contraste ≈ 4,6:1, seuil AA).
        "text-dim": "#757575",
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