import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Déconnexion. POST (jamais GET, pour éviter une déconnexion par simple
// préchargement de lien). Invalide la session puis renvoie au login.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
