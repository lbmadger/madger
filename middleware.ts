import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ACCESS_COOKIE, getAccessCode } from "@/lib/access";

// Pages publiques (accessibles SANS code d'accès) : la landing, les pages
// légales et la page de saisie du code. Tout le reste de l'app est verrouillé
// tant que le code pré-lancement n'a pas été saisi.
const PUBLIC_EXACT = new Set([
  "/",
  "/acces",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
]);
const PUBLIC_PREFIXES = [
  "/cgu",
  "/cgv",
  "/mentions-legales",
  "/politique-cookies",
  "/politique-de-confidentialite",
];

// Espaces nécessitant une session Supabase valide (redirigent vers /login).
const AUTH_PREFIXES = ["/dashboard", "/onboarding", "/messages"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Le verrou ne s'applique jamais aux routes API (webhooks Stripe, crons… n'ont
  // pas le cookie et gèrent leur propre sécurité) ni aux pages publiques.
  const isGated =
    !pathname.startsWith("/api/") &&
    !PUBLIC_EXACT.has(pathname) &&
    !matchesPrefix(pathname, PUBLIC_PREFIXES);

  if (isGated && request.cookies.get(ACCESS_COOKIE)?.value !== getAccessCode()) {
    const url = request.nextUrl.clone();
    url.pathname = "/acces";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Rafraîchissement/validation de session sur les espaces authentifiés.
  if (matchesPrefix(pathname, AUTH_PREFIXES)) {
    return await updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  // Tout sauf les fichiers statiques et internes Next.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
