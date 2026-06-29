import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase à chaque requête sur les routes protégées et
// redirige les visiteurs non connectés vers /login. Appelé UNIQUEMENT depuis
// le middleware racine, dont le matcher est limité à /dashboard : la landing
// n'exécute jamais ce code.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalide le token côté serveur Supabase (ne pas se fier au seul
  // contenu du cookie pour une décision de sécurité).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Non connecté sur une route protégée → redirection vers le login, en
    // mémorisant la destination pour y revenir après connexion.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
