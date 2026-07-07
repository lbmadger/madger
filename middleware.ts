import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ACCESS_COOKIE, getAccessCode } from "@/lib/access";

// Pages publiques (accessibles SANS code d'accès) : la landing, les pages
// légales et la page de saisie du code. Tout le reste de l'app est verrouillé
// tant que le code pré-lancement n'a pas été saisi.
const PUBLIC_EXACT = new Set([
  "/",
  "/acces",
  // Réinitialisation de mot de passe : accessible sans code d'accès pour que
  // le lien reçu par email fonctionne dans n'importe quel navigateur.
  "/forgot-password",
  "/reset-password",
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
const AUTH_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/onboarding-client",
  "/messages",
  "/espace",
  "/reset-password", // session posée par le lien email (recovery)
];

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

  const res = NextResponse.next();

  // Première visite sans langue choisie : déduit la langue du navigateur
  // (Accept-Language). Un visiteur anglophone du marketplace obtient l'EN
  // sans action ; le choix explicite (cookie posé par LanguagePicker) prime.
  if (!request.cookies.get("madger_locale")) {
    const accept = request.headers.get("accept-language") ?? "";
    const prefersEnglish = /^en\b/i.test(accept.split(",")[0] ?? "");
    res.cookies.set("madger_locale", prefersEnglish ? "en" : "fr", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return res;
}

export const config = {
  // Tout sauf les fichiers statiques et internes Next.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
