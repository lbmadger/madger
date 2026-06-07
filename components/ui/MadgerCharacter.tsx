"use client";

import { useState } from "react";

/**
 * MadgerCharacter — mascotte 3D de la marque, en calque décoratif.
 *
 * L'image source a un fond sombre (≈ #0A0A0A) : on l'utilise telle quelle et on
 * fond ses bords dans la page grâce à un masque radial. Posé sur un fond sombre
 * (le site), le raccord est invisible — pas besoin de détourage.
 *
 * Le parent DOIT être `position: relative` (idéalement `overflow-hidden`).
 * Décoratif → masqué aux lecteurs d'écran, ne capte pas la souris.
 *
 * Fichier attendu : public/character/madger-character.png
 */

interface MadgerCharacterProps {
  /** Bord d'ancrage. */
  side?: "left" | "right";
  /** Effet miroir (personnage retourné). */
  flip?: boolean;
  /** Largeur sur desktop, en vw. */
  widthVw?: number;
  /** Largeur max en px (garde-fou sur grands écrans). */
  maxWidth?: number;
  /** Débordement hors du bord, en % (négatif = sort de l'écran). */
  inset?: string;
  /** Opacité globale. */
  opacity?: number;
  /** Chemin de l'image (override possible). */
  src?: string;
  className?: string;
}

export default function MadgerCharacter({
  side = "right",
  flip = false,
  widthVw = 32,
  maxWidth = 520,
  inset = "-3%",
  opacity = 1,
  src = "/character/madger-character.png",
  className = "",
}: MadgerCharacterProps) {
  const edgeMask =
    "radial-gradient(ellipse 72% 84% at 50% 46%, #000 56%, transparent 84%)";

  // Tant que l'image n'est pas déposée dans le repo, on n'affiche rien
  // (pas d'icône « image cassée »).
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div
      aria-hidden="true"
      className={`hidden lg:block absolute bottom-0 pointer-events-none select-none ${className}`}
      style={{
        [side]: inset,
        width: `${widthVw}vw`,
        maxWidth,
        opacity,
        zIndex: 0,
      }}
    >
      {/* Halo néon derrière le personnage */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 52% 44% at 50% 42%, rgba(203,255,3,0.12), transparent 70%)",
          filter: "blur(6px)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        style={{
          position: "relative",
          width: "100%",
          height: "auto",
          display: "block",
          transform: flip ? "scaleX(-1)" : undefined,
          WebkitMaskImage: edgeMask,
          maskImage: edgeMask,
        }}
      />
    </div>
  );
}
