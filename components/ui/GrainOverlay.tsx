// Grain de film : la signature discrète des interfaces premium sur fond
// sombre. Bruit fractal SVG encodé en data-URI, posé en overlay fixe au-
// dessus de toute la page. Statique (aucune animation) pour rester gratuit
// en CPU/batterie, y compris sur mobile. pointer-events:none → jamais dans
// le chemin des clics.
export default function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: 0.05,
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
      }}
    />
  );
}
