// Un lien de navigation reste actif sur sa route ET ses sous-routes
// (ex. « Clients » reste surligné sur /dashboard/clients/123). La racine du
// dashboard fait exception : passée en `exact`, elle ne s'allume que sur
// elle-même, sinon elle resterait active partout dans le dashboard.
export function isNavActive(
  pathname: string,
  href: string,
  exact = false
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
