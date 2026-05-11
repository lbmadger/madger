"use client";

import { useEffect, useState } from "react";

export default function ScrollBackground() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const fn = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        mixBlendMode: "screen",
        overflow: "hidden",
      }}
    >
      {/* Orbe principal — descend avec le scroll */}
      <div
        style={{
          position: "absolute",
          width: "75vw",
          height: "75vw",
          maxWidth: 960,
          maxHeight: 960,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.13) 0%, transparent 62%)",
          left: "-18%",
          top: `${-15 + p * 60}%`,
          filter: "blur(72px)",
          transition: "top 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "top",
        }}
      />
      {/* Orbe secondaire — remonte avec le scroll */}
      <div
        style={{
          position: "absolute",
          width: "55vw",
          height: "55vw",
          maxWidth: 720,
          maxHeight: 720,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.08) 0%, transparent 62%)",
          right: "-12%",
          top: `${65 - p * 55}%`,
          filter: "blur(96px)",
          transition: "top 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "top",
        }}
      />
      {/* Micro orbe accent — mid-page */}
      <div
        style={{
          position: "absolute",
          width: "30vw",
          height: "30vw",
          maxWidth: 400,
          maxHeight: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(203,255,3,0.06) 0%, transparent 62%)",
          left: "35%",
          top: `${20 + p * 40}%`,
          filter: "blur(60px)",
          transition: "top 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "top",
        }}
      />
    </div>
  );
}
