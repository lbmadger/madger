"use client";

// Affichage d'une note en étoiles (lecture seule). `value` sur 5, décimales
// acceptées (arrondi à la demi-étoile la plus proche pour l'affichage).
export default function Stars({
  value,
  size = 14,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill =
          rounded >= i + 1 ? 1 : rounded >= i + 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={`half-${i}-${size}`}>
                <stop offset="50%" stopColor="#CBFF03" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={
                fill === 1
                  ? "#CBFF03"
                  : fill === 0.5
                  ? `url(#half-${i}-${size})`
                  : "rgba(255,255,255,0.15)"
              }
            />
          </svg>
        );
      })}
    </span>
  );
}
