"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Carte « répartition des coachs » de l'admin : tuiles sombres + points
// lumineux (halo accent), façon control room. Leaflet est chargé dans le
// useEffect (client only) : aucun poids côté serveur.

export type AdminMapPoint = {
  lat: number;
  lng: number;
  label: string;
  pro: boolean;
};

export default function AdminMap({ points }: { points: AdminMapPoint[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mountRef.current) return;

      map = L.map(mountRef.current, {
        center: [46.6, 2.4], // France
        zoom: 5,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      const escapeHtml = (s: string) =>
        s.replace(
          /[&<>"']/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[ch] as string
        );

      const bounds: [number, number][] = [];
      for (const p of points) {
        bounds.push([p.lat, p.lng]);
        // Halo extérieur (la lueur), puis le point net par-dessus.
        L.circleMarker([p.lat, p.lng], {
          radius: p.pro ? 14 : 10,
          stroke: false,
          fillColor: "#CBFF03",
          fillOpacity: p.pro ? 0.18 : 0.1,
        }).addTo(map!);
        L.circleMarker([p.lat, p.lng], {
          radius: p.pro ? 5.5 : 4,
          stroke: true,
          color: "#0A0A0A",
          weight: 1,
          fillColor: p.pro ? "#CBFF03" : "#8FB300",
          fillOpacity: p.pro ? 1 : 0.8,
        })
          .addTo(map!)
          .bindTooltip(escapeHtml(p.label), { direction: "top", offset: [0, -6] });
      }

      // Cadre ajusté aux points (léger padding), sinon France entière.
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
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
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-border"
      aria-label="Carte de répartition des coachs"
    />
  );
}
