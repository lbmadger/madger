"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { PublicCoach } from "@/lib/coaches/public-types";
import { coachFullName } from "@/lib/coaches/public-types";

// Carte des coachs : plots par coordonnées (ville du coach), tuiles sombres
// assorties au thème. Leaflet est chargé DYNAMIQUEMENT (client only) pour
// ne jamais peser sur le bundle initial ni le rendu serveur. Chaque point
// ouvre une bulle avec le nom, la ville et un lien vers la page du coach.
export default function CoachesMap({
  coaches,
  locale,
}: {
  coaches: PublicCoach[];
  locale: "fr" | "en";
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mountRef.current) return;

      // Coachs géolocalisés uniquement.
      const located = coaches.filter(
        (c) => typeof c.lat === "number" && typeof c.lng === "number"
      );

      map = L.map(mountRef.current, {
        // Centre France par défaut ; ajusté aux points juste après.
        center: [46.6, 2.4],
        zoom: 5,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      // Tuiles sombres (CartoDB dark matter) : cohérent avec le thème Madger.
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
            })[ch] ?? ch
        );

      const bounds: [number, number][] = [];
      const seeLabel = locale === "en" ? "See profile" : "Voir le profil";

      for (const c of located) {
        const lat = c.lat as number;
        const lng = c.lng as number;
        bounds.push([lat, lng]);

        // Pastille accent en HTML (divIcon) : pas d'image externe à charger,
        // et couleur pile dans la charte.
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#CBFF03;border:2px solid #0A0A0A;box-shadow:0 0 0 2px rgba(203,255,3,0.35);"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const name = escapeHtml(coachFullName(c));
        const city = c.city ? escapeHtml(c.city) : "";
        const popup = `
          <div style="min-width:150px;">
            <div style="font-weight:700;color:#0A0A0A;">${name}</div>
            ${city ? `<div style="color:#555;font-size:12px;margin-top:2px;">${city}</div>` : ""}
            <a href="/${escapeHtml(c.slug)}" style="display:inline-block;margin-top:8px;color:#0A0A0A;font-weight:600;font-size:13px;text-decoration:underline;">${seeLabel} &rarr;</a>
          </div>`;

        L.marker([lat, lng], { icon, title: coachFullName(c) })
          .addTo(map)
          .bindPopup(popup);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 11);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [coaches, locale]);

  return (
    <div
      ref={mountRef}
      role="application"
      aria-label={
        locale === "en" ? "Map of coaches" : "Carte des coachs"
      }
      className="h-[520px] w-full overflow-hidden rounded-2xl border border-border"
      style={{ background: "#0A0A0A" }}
    />
  );
}
