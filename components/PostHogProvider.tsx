"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * Provider PostHog idiomatique App Router.
 *
 * - Région EU obligatoire (RGPD, audience 100 % France) : api_host pointe sur
 *   eu.i.posthog.com. Ne jamais basculer sur l'host US.
 * - Clé projet lue depuis NEXT_PUBLIC_POSTHOG_KEY (jamais en dur). Si la
 *   variable est absente (build local sans secrets, preview…), on n'initialise
 *   pas : le site fonctionne normalement, sans tracking.
 * - person_profiles 'identified_only' : pas de profil pour les visiteurs
 *   anonymes.
 * - Session replay activé. maskAllInputs masque la valeur de tous les champs
 *   (email, téléphone, défi…) : aucune donnée saisie n'est enregistrée.
 * - Autocapture laissé au comportement par défaut (activé).
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    // Pas de clé → pas d'init (évite un init avec une clé vide en local/preview).
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      // Session replay : enregistre la navigation, masque toutes les valeurs
      // de champs pour ne capter aucune donnée personnelle saisie.
      session_recording: {
        maskAllInputs: true,
      },
      // Page unique : on conserve l'autocapture et le pageview par défaut.
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
