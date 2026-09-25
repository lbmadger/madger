// Ouverture publique de Madger : instant du basculement (SITE_LAUNCHED=1 et
// redéploiement, programmés) et libellé affiché par le compte à rebours.
export const LAUNCH_AT = "2026-09-27T16:00:00Z"; // dimanche 27 septembre 2026, 18h à Paris
export const LAUNCH_LABEL = "dimanche 27 septembre à 18h";

export function launchOpened(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(LAUNCH_AT).getTime();
}
