// Ouverture publique de Madger : instant du basculement (SITE_LAUNCHED=1 et
// redéploiement, programmés) et libellé affiché par le compte à rebours.
export const LAUNCH_AT = "2026-10-04T16:00:00Z"; // dimanche 4 octobre 2026, 18h à Paris
export const LAUNCH_LABEL = "dimanche 4 octobre à 18h";

// Fin de l'accès anticipé (places fondateurs) : à partir de cet instant et
// jusqu'à l'ouverture, le formulaire inscrit en liste d'attente.
export const EARLY_ACCESS_CLOSED_AT = "2026-10-01T22:00:00Z"; // vendredi 2 octobre 2026, 0h à Paris

export function earlyAccessClosed(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(EARLY_ACCESS_CLOSED_AT).getTime();
}

export function launchOpened(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(LAUNCH_AT).getTime();
}

// Le site est ouvert si SITE_LAUNCHED=1 (bascule manuelle + redéploiement)
// OU si l'heure d'ouverture est passée : filet automatique, le compte à
// rebours promet 18h précises, le verrou tombe seul même sans redéploiement.
// Côté serveur uniquement (middleware, pages, routes) : dans un composant
// client, process.env.SITE_LAUNCHED n'existe pas et seule l'heure compte.
export function siteLaunched(now: Date = new Date()): boolean {
  return process.env.SITE_LAUNCHED === "1" || launchOpened(now);
}
