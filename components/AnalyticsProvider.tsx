"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, trackPageview } from "@/lib/analytics/posthog";

// Initialise PostHog au montage et envoie une pageview à chaque changement
// de route (l'App Router ne recharge pas la page). Rend null : aucun impact
// visuel. useSearchParams impose une frontière Suspense (fournie ici même).
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageview();
    // searchParams inclus : /coachs?ville=lyon compte comme une vue distincte.
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
