import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point de retour OAuth (Google) et confirmation d'email. Supabase renvoie un
// `code` qu'on échange ici contre une session (cookies posés), puis on
// redirige vers la destination demandée (par défaut le dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Chemin interne uniquement (anti open redirect).
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  // `as` indique l'intention (coach/client) lors d'une connexion Google : le
  // flux OAuth ne transmet pas de métadonnées utilisateur, donc on attribue le
  // rôle ici. Pour un coach, on crée sa ligne `coaches` (la RLS coaches_insert_self
  // autorise un utilisateur à créer SA propre ligne).
  const as = searchParams.get("as");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (as === "coach") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Idempotent : ignore le conflit si la ligne existe déjà.
          await supabase.from("coaches").insert({ id: user.id });
        }
      }
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Échec ou code manquant : retour au login.
  return NextResponse.redirect(`${origin}/login`);
}
