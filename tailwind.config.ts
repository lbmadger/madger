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
        "text-muted": "#8A8A8A",
        "text-dim": "#5A5A5A",
        border: "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.12)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
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