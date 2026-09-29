"use client";

import { useEffect } from "react";

// Marque l'appareil comme « équipe » dès qu'il ouvre le back-office : un
// cookie d'un an, lu par l'initialisation des analytics, qui n'envoie alors
// plus rien depuis cet appareil. Les visites du fondateur (PC, téléphone)
// ne comptent plus dans le trafic réel. Rendu nul.
export const INTERNAL_COOKIE = "madger_internal";

export default function InternalDeviceMarker() {
  useEffect(() => {
    try {
      document.cookie = `${INTERNAL_COOKIE}=1; max-age=31536000; path=/; samesite=lax; secure`;
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
