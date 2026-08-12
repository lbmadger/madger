import Image from "next/image";

// Léo, la mascotte Madger, dans l'app : il habite les états vides et les
// moments de victoire pour que l'interface ne soit jamais un mur froid.
// Poses disponibles : "ok" (pouce levé) et "point" (doigt tendu).
export default function Leo({
  pose = "ok",
  size = 96,
  className = "",
}: {
  pose?: "ok" | "point";
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/character/coach-${pose}.webp`}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 1.25)}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
