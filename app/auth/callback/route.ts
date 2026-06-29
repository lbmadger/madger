import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point de retour OAuth (Google) et confirmation d'email. Supabase renvoie un
// `code` qu'on échange ici contre une session (cookies posés), puis on
// redirige vers la destination demandée (par défaut le dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Échec ou code manquant : retour au login.
  return NextResponse.redirect(`${origin}/login`);
}
