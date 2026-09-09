import * as React from "react";
import { readFile } from "fs/promises";
import path from "path";

// Cartes story Instagram (1080x1920) : cadre commun, étoiles, accroche et
// polices. Séparées de la route pour pouvoir être rendues avec des données
// d'exemple (tests, aperçus) sans session.

export const ACCENT = "#CBFF03";
export const BG = "#0A0A0A";
export const MUTED = "#9A9A9A";
export const DIM = "#6E6E6E";

// Icône iOS de l'app (la même que apple-icon.tsx), embarquée en data URI.
const LOGO_SVG = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="180" height="180" rx="40" fill="#111111"/><rect x="1.5" y="1.5" width="177" height="177" rx="38.5" stroke="rgba(255,255,255,0.14)" stroke-width="3" fill="none"/><path d="M 22 146 L 53 56 L 84 104 L 115 50 L 132 107 C 140 104 149 67 155 31" fill="none" stroke="#CBFF03" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="155" cy="31" r="7.3" fill="#CBFF03"/></svg>`;
const LOGO_SRC = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

export async function loadFonts() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [grotesk, inter, interSemi] = await Promise.all([
    readFile(path.join(dir, "SpaceGrotesk-Bold.ttf")),
    readFile(path.join(dir, "Inter-Regular.ttf")),
    readFile(path.join(dir, "Inter-SemiBold.ttf")),
  ]);
  return [
    { name: "Grotesk", data: grotesk, weight: 700 as const },
    { name: "Inter", data: inter, weight: 400 as const },
    { name: "Inter", data: interSemi, weight: 600 as const },
  ];
}

export function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? ACCENT : "rgba(255,255,255,0.14)"}
      />
    </svg>
  );
}

export function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.14 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} filled={i < rating} size={size} />
      ))}
    </div>
  );
}

// Cadre commun : fond noir + halo vert, wordmark en haut, lien du coach en
// bas. Le contenu de la carte vit au centre.
export function Frame({
  slug,
  children,
}: {
  slug: string | null;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(203,255,3,0.14), rgba(10,10,10,0) 55%), radial-gradient(circle at 50% 100%, rgba(203,255,3,0.10), rgba(10,10,10,0) 45%)",
        padding: "110px 90px 100px",
        alignItems: "center",
      }}
    >
      {/* Branding discret : l'icône iOS de l'app au-dessus du wordmark en
          filigrane. La story appartient au coach, pas à Madger. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} width={76} height={76} alt="" />
        <div
          style={{
            display: "flex",
            fontFamily: "Grotesk",
            fontSize: 28,
            color: "rgba(255,255,255,0.32)",
            letterSpacing: 8,
          }}
        >
          MADGER
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexGrow: 1,
          width: "100%",
        }}
      >
        {children}
      </div>

      {/* Pied discret : sur une story rien n'est cliquable, le réflexe
          Instagram c'est le lien en bio (où vit déjà madger.app/slug). Pas
          de grosse pastille : la carte reste celle du coach. */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 27,
            color: DIM,
            letterSpacing: 5,
          }}
        >
          {slug ? "RÉSERVE TA SÉANCE ·" : "L'APP DES COACHS SPORTIFS"}
        </div>
        {slug && (
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: 27,
              color: ACCENT,
              letterSpacing: 5,
            }}
          >
            LIEN EN BIO
          </div>
        )}
      </div>
    </div>
  );
}

export function Kicker({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: 34,
        color: ACCENT,
        letterSpacing: 12,
        marginBottom: 56,
      }}
    >
      {children.toUpperCase()}
    </div>
  );
}


// Conteneur d'une carte : satori rend un Fragment comme un bloc en LIGNE
// (flex row par défaut), ce qui étale accroche, chiffre et texte côte à
// côte. Chaque carte vit donc dans cette colonne centrée.
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
