"use client";

import posthog from "posthog-js";

// Analytics produit (PostHog, hébergement UE) en mode SANS COOKIE :
// persistence mémoire, pas de bannière de consentement requise pour de la
// mesure d'audience simple. Si NEXT_PUBLIC_POSTHOG_KEY est absente, tout
// devient un no-op silencieux (dev, préviews).
//
// Ce qu'on mesure : pages vues + temps passé (capture_pageleave), clics
// (autocapture) et les étapes des entonnoirs (événements explicites
// early_access_* / onboarding_*) pour voir OÙ les gens abandonnent.

let ready = false;

export function initAnalytics(): void {
  if (ready || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    // Pageviews envoyées manuellement au changement de route (App Router).
    capture_pageview: false,
    // Départ de page → durée réelle passée sur chaque page.
    capture_pageleave: true,
    autocapture: true,
    // Pas de cookie : session en mémoire, rien de persistant sur l'appareil.
    persistence: "memory",
  });
  ready = true;
}

export function trackPageview(): void {
  if (!ready) return;
  posthog.capture("$pageview");
}

export function track(
  event: string,
  props?: Record<string, unknown>
): void {
  if (!ready) return;
  posthog.capture(event, props);
}
