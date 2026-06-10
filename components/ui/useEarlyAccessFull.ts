"use client";

import { useEffect, useState } from "react";

/**
 * État "accès anticipé complet" partagé (hero + formulaire).
 * On ne récupère QU'un booléen depuis l'API : aucun nombre d'inscrits n'est
 * exposé, donc impossible de suivre la progression des inscriptions.
 */
export function useEarlyAccessFull(): boolean {
  const [full, setFull] = useState(false);

  useEffect(() => {
    fetch("/api/early-access")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFull(Boolean(d.full)))
      .catch(() => {});
  }, []);

  return full;
}
