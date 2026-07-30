"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Carte « répartition des coachs » de l'admin : MapLibre GL + style sombre
// CARTO, points lumineux (halo accent) façon control room. En dézoomant, la
// projection globe prend le relais (vraie Terre 3D). Libellés forcés en
// français quand la tuile les fournit. Chargé dans le useEffect : client only.

export type AdminMapPoint = {
  lat: number;
  lng: number;
  label: string;
  pro: boolean;
};

export default function AdminMap({ points }: { points: AdminMapPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !mountRef.current) return;

      const m = new maplibregl.Map({
        container: mountRef.current,
        style:
          "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        center: [2.4, 46.6], // France
        zoom: 4.4,
        // La molette ne zoome pas (sinon impossible de scroller la page) :
        // les boutons +/- et le pincement tactile restent actifs.
        scrollZoom: false,
      });
      map = m;
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-left"
      );

      m.on("style.load", () => {
        // Le globe : dézoomer montre la Terre entière en 3D.
        m.setProjection({ type: "globe" });
        // Libellés en français partout où la tuile propose name_fr,
        // sinon nom local (jamais l'anglais forcé).
        for (const layer of m.getStyle().layers ?? []) {
          if (layer.type !== "symbol") continue;
          const tf = m.getLayoutProperty(layer.id, "text-field");
          if (!tf) continue;
          m.setLayoutProperty(layer.id, "text-field", [
            "coalesce",
            ["get", "name_fr"],
            ["get", "name:fr"],
            ["get", "name"],
          ]);
        }
      });

      const bounds = new maplibregl.LngLatBounds();
      for (const p of points) {
        bounds.extend([p.lng, p.lat]);
        // Point net + halo lumineux en CSS (box-shadow), tooltip natif.
        const el = document.createElement("div");
        const size = p.pro ? 12 : 9;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "9999px";
        el.style.background = p.pro ? "#CBFF03" : "#8FB300";
        el.style.border = "1px solid #0A0A0A";
        el.style.boxShadow = p.pro
          ? "0 0 12px 5px rgba(203,255,3,0.4)"
          : "0 0 9px 3px rgba(203,255,3,0.25)";
        el.style.cursor = "pointer";
        el.title = p.label;
        new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(m);
      }

      // Cadre ajusté aux points (léger padding), sinon France entière.
      if (points.length > 0) {
        m.fitBounds(bounds, { padding: 60, maxZoom: 8 });
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return (
    <div
      ref={mountRef}
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-border bg-[#0A0A0A]"
      aria-label="Carte de répartition des coachs"
    />
  );
}
